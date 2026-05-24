'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bug, Thermometer, Droplets, UtensilsCrossed, AlertTriangle, Heart, Share2, MessageSquare, Zap, Minus, Plus, ShoppingCart, Star, Send, User as UserIcon } from 'lucide-react';
import { getProxiedImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageViewer } from '@/components/shared/molecules/image-viewer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/shared/atoms/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Db } from '@/lib/db';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import type { Product, Order, Category } from '@/types';
import { formatPrice } from '@/constants/pricing';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { useModules } from '@/hooks/use-modules';
import { useReviewStore } from '@/store/review-store';
import { useCartStore } from '@/store/cart-store';
import { useFavoriteStore } from '@/store/favorite-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const careLevelColors: Record<string, string> = {
  beginner: 'bg-green-500 text-black hover:bg-green-400',
  intermediate: 'bg-blue-500 text-white hover:bg-blue-400',
  advanced: 'bg-orange-500 text-black hover:bg-orange-400',
  expert: 'bg-red-500 text-white hover:bg-red-400',
};

const temperamentColors: Record<string, string> = {
  docile: 'text-green-400',
  'semi-aggressive': 'text-yellow-400',
  aggressive: 'text-red-400',
  defensive: 'text-orange-400',
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isVisible } = useModules();
  const { user, isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryDef, setCategoryDef] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { isLiked: checkIsLiked, toggleLike } = useFavoriteStore();
  const isLiked = checkIsLiked(params.id as string, 'product');
  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number>(0);
  const { reviews, loadReviews, addReview, isLoading: reviewsLoading } = useReviewStore();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setDeliveryName(user.name);
        setDeliveryPhone(user.phone || '');
      }, 0);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      const p = await Db.getById<Product>('products', params.id as string);
      let catDef = null;
      if (p) {
        const categories = await Db.getAll<Category>('categories');
        catDef = categories.find(c => c.name === p.mainCategory) || null;
      }
      setTimeout(async () => {
        setProduct(p);
        setCategoryDef(catDef);
        setLoading(false);
        loadReviews(params.id as string, 'product');
  
        if (user && p) {
          const orders = await Db.getAll<Order>('orders');
          const purchased = orders.some(
            (ord) => ord.userId === user.id && ord.items.some((item) => item.id === p.id && item.type === 'product') && ['payment_verified', 'order_shipped', 'order_completed'].includes(ord.status)
          );
          setHasPurchased(purchased);
        }
      }, 0);
    })();
  }, [params.id, loadReviews, user]);

  const handleLike = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.error('Please login to save favorites', {
        action: {
          label: 'Login',
          onClick: () => router.push('/login'),
        },
      });
      return;
    }
    
    const { user } = useAuthStore.getState();
    await toggleLike(product.id, 'product', user?.id);
    
    // Refresh the local product to update like count (UI only)
    const currentIsLiked = checkIsLiked(product.id, 'product');
    const delta = currentIsLiked ? -1 : 1;
    setProduct(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) + delta) } : null);
  };

  useEffect(() => {
    const pending = localStorage.getItem('pending_inquiry');
    if (pending && isAuthenticated && user && product) {
      try {
        const { productId, message: pMsg, quantity: pQty, selectedSize: pSize } = JSON.parse(pending);
        if (productId === product.id) {
          setMessage(pMsg);
          setQuantity(pQty);
          setSelectedSize(pSize);
          setInquiryOpen(true);
          localStorage.removeItem('pending_inquiry');
          toast.success('Restored your pending inquiry!');
        }
      } catch (e) {
        console.error('Failed to parse pending inquiry', e);
      }
    }
  }, [isAuthenticated, user, product, params.id]);

  const currentPrice = product?.sizes?.[selectedSize]?.price || 0;

  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!product) return;
    const size = product.sizes[selectedSize];
    addItem(product, 'product', { size, quantity });
    toast.success(`${product.name} added to cart`, {
      description: `Size: ${size.size} | Qty: ${quantity}`,
      icon: <ShoppingCart className="h-4 w-4" />,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 bg-muted rounded" />
              <div className="h-6 w-1/2 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        {isVisible('products') && <Link href="/shop"><Button>Back to Shop</Button></Link>}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        {isVisible('products') && (
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
          </Button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="aspect-square rounded-xl bg-gradient-to-br from-brand-red/20 via-background to-brand-gold/10 relative overflow-hidden border border-border group">
            {product.images && product.images.length > 0 ? (
              <ImageViewer
                src={product.images[activeImage]}
                alt={product.name}
                className="w-full h-full"
                imageClassName="transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Bug className="h-32 w-32 text-brand-red/20" />
              </div>
            )}
            <div className="absolute top-4 right-4 flex gap-2 items-center">
              <Badge className={careLevelColors[product.careLevel]}>
                {product.careLevel}
              </Badge>
              <button
                onClick={handleLike}
                className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 ${
                  isLiked 
                    ? 'bg-red-500 text-white border-red-400' 
                    : 'bg-black/60 text-white hover:bg-black/80'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
            
            {/* Like Count Overlay */}
            <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 shadow-xl">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                {product.likes || 0} Likes
              </span>
            </div>
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${activeImage === idx ? 'border-brand-gold' : 'border-border hover:border-brand-gold/50'
                    }`}
                >
                  <img src={getProxiedImageUrl(img)} alt={`${product.name} ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className="border-white/30 bg-black/50 text-white text-[10px] uppercase tracking-wider backdrop-blur-sm">{product.mainCategory}</Badge>
              <Badge variant="outline" className="border-white/30 bg-black/50 text-white text-[10px] capitalize backdrop-blur-sm">{product.category || 'General'}</Badge>
              {categoryDef?.fields?.map(field => {
                if (!field.showAsBadge) return null;
                let value = product.customMeta?.[field.id];
                if (!value) {
                  if (product.tarantulaMeta && (product.tarantulaMeta as any)[field.id]) value = (product.tarantulaMeta as any)[field.id];
                  else if (product.scorpionMeta && (product.scorpionMeta as any)[field.id]) value = (product.scorpionMeta as any)[field.id];
                  else if (product.centipedeMeta && (product.centipedeMeta as any)[field.id]) value = (product.centipedeMeta as any)[field.id];
                }
                if (!value) return null;
                return (
                  <Badge key={field.id} variant="outline" className="border-brand-gold/40 bg-brand-gold/10 text-brand-gold text-[10px] capitalize backdrop-blur-sm">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </Badge>
                );
              })}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 uppercase tracking-tight">{product.name}</h1>
            <p className="text-base sm:text-lg text-muted-foreground italic">{product.scientificName}</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-brand-gold">{formatPrice(currentPrice)}</span>
            <Badge className={(product.sizes?.[selectedSize]?.stock || 0) > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
              {(product.sizes?.[selectedSize]?.stock || 0) > 0 
                ? `${product.sizes?.[selectedSize]?.stock} in stock` 
                : 'Out of stock'}
            </Badge>
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Size</Label>
              <div className="flex flex-wrap gap-2">
                {product.sizes?.map((s, idx) => (
                  <Button
                    key={idx}
                    variant={selectedSize === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSize(idx)}
                    className={selectedSize === idx ? 'bg-brand-gold text-black hover:bg-brand-gold/90' : 'border-border'}
                  >
                    {s.size} - {formatPrice(s.price)} 
                    <span className="ml-2 opacity-60 text-[10px]">({s.stock} available)</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-accent/50" />

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border bg-card/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Thermometer className="h-4 w-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Temp</p>
                  <p className="text-xs font-medium truncate">{product.temperature}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Droplets className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Humidity</p>
                  <p className="text-xs font-medium truncate">{product.humidity}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="h-4 w-4 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Feeding</p>
                  <p className="text-xs font-medium truncate">{product.feeding}</p>
                </div>
              </CardContent>
            </Card>

            {categoryDef?.fields?.map(field => {
              if (field.showAsBadge) return null; // Already shown in badges area
              let value = product.customMeta?.[field.id];
              if (!value) {
                if (product.tarantulaMeta && (product.tarantulaMeta as any)[field.id]) value = (product.tarantulaMeta as any)[field.id];
                else if (product.scorpionMeta && (product.scorpionMeta as any)[field.id]) value = (product.scorpionMeta as any)[field.id];
                else if (product.centipedeMeta && (product.centipedeMeta as any)[field.id]) value = (product.centipedeMeta as any)[field.id];
              }
              if (value === undefined || value === '') return null;
              
              // Handle boolean
              if (field.type === 'boolean') {
                 value = value ? 'Yes' : 'No';
              } else if (Array.isArray(value)) {
                 value = value.join(', ');
              }

              return (
                <Card key={field.id} className="border-border bg-card/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-brand-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">{field.label}</p>
                      <p className="text-xs font-medium truncate">{String(value)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-4 bg-card/50 border border-border rounded-xl p-2 w-fit">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-lg hover:bg-brand-red/10 hover:text-brand-red"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-bold w-12 text-center">{quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-lg hover:bg-brand-gold/10 hover:text-brand-gold"
                onClick={() => {
                  const maxStock = product.sizes?.[selectedSize]?.stock || 0;
                  setQuantity(Math.min(maxStock, quantity + 1));
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1 bg-brand-red hover:bg-brand-red/90 text-white font-bold h-14 shadow-lg shadow-brand-red/20" 
                disabled={(product.sizes?.[selectedSize]?.stock || 0) === 0 || product.available === false}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> 
                {product.available === false ? 'Unavailable' : (product.sizes?.[selectedSize]?.stock || 0) === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className={`border-border h-14 w-14 p-0 transition-all duration-300 ${isLiked ? 'bg-red-500 text-white border-red-400' : 'hover:bg-red-500/10 hover:text-red-500'}`}
                onClick={handleLike}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-16 space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-brand-red" />
            Customer Reviews
          </h2>
          <div className="flex items-center gap-1 bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            <Star className="h-4 w-4 text-brand-gold fill-brand-gold" />
            <span className="text-sm font-bold text-brand-gold">
              {reviews.filter(r => r.status === 'approved').length > 0
                ? (reviews.filter(r => r.status === 'approved').reduce((acc, r) => acc + r.rating, 0) / reviews.filter(r => r.status === 'approved').length).toFixed(1)
                : 'No reviews'
              }
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Review Form */}
          <Card className="lg:col-span-1 border-border bg-card/50 h-fit">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                {isAuthenticated && user && (
                  <Avatar className="h-8 w-8 border border-brand-red/30">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-brand-red text-white text-[10px]">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <h3 className="font-semibold">Write a Review</h3>
              </div>
              {isAuthenticated ? (
                hasPurchased ? (
                  <div className="space-y-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${reviewRating >= star ? 'text-brand-gold fill-brand-gold' : 'text-muted-foreground'}`}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-comment">Your Feedback</Label>
                      <Textarea
                        id="review-comment"
                        placeholder="Share your experience with this species..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="bg-background/50"
                      />
                    </div>
                    <Button
                      className="w-full bg-brand-red hover:bg-brand-red-light text-white font-bold"
                      disabled={!reviewComment.trim() || submittingReview}
                      onClick={async () => {
                        if (!user || !product) return;
                        setSubmittingReview(true);
                        await addReview({
                          targetId: product.id,
                          targetType: 'product',
                          userId: user.id,
                          userName: user.name,
                          userAvatar: user.avatar,
                          rating: reviewRating,
                          comment: reviewComment,
                        });
                        toast.success('Review submitted for moderation!');
                        setReviewComment('');
                        setReviewRating(5);
                        setSubmittingReview(false);
                      }}
                    >
                      {submittingReview ? 'Submitting...' : <><Send className="mr-2 h-4 w-4" /> Post Review</>}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center italic">
                      Your review will be visible after admin approval.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Only customers who have purchased this product can leave a review.</p>
                  </div>
                )
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Please login to share your thoughts.</p>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full">Login Now</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {reviews.filter(r => r.status === 'approved').length === 0 ? (
              <div className="text-center py-12 bg-accent/10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No approved reviews yet. Be the first to review!</p>
              </div>
            ) : (
              reviews.filter(r => r.status === 'approved').map((review) => (
                <Card key={review.id} className="border-border bg-card/30 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-brand-red/30">
                          <AvatarImage src={review.userAvatar} />
                          <AvatarFallback className="bg-brand-red text-white">
                            {review.userName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold">{review.userName}</p>
                          <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${review.rating >= star ? 'text-brand-gold fill-brand-gold' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      &quot;{review.comment}&quot;
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
