'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight, MapPin, Phone, User as UserIcon, CreditCard, CheckCircle2, Ticket, Tag, Loader2, Percent } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/shared/atoms/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/constants/pricing';
import { Db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useNotificationStore } from '@/store/notification-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Order, Product, ProductSize, SystemSettings, ShippingRule, User } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productDetails, setProductDetails] = useState<Record<string, Product>>({});
  const [shippingSettings, setShippingSettings] = useState<SystemSettings['shippingSettings'] | null>(null);
  const [shippingCharge, setShippingCharge] = useState(0);

  // Discount Coupons states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  // Load active coupons list
  useEffect(() => {
    (async () => {
      try {
        const coupons = await Db.getAll<any>('coupons');
        const active = coupons.filter(c => c.isActive);
        setAvailableCoupons(active);
      } catch (err) {
        console.error('Failed to load coupons:', err);
      }
    })();
  }, []);

  const checkCouponEligibility = (coupon: any) => {
    const subtotal = totalPrice();

    // 1. Expiration check
    const todayStr = new Date().toISOString().split('T')[0];
    if (coupon.validFrom && todayStr < coupon.validFrom) {
      return { eligible: false, reason: 'Offer starts soon' };
    }
    if (coupon.validUntil && todayStr > coupon.validUntil) {
      return { eligible: false, reason: 'Offer expired' };
    }

    // 2. Global limit check
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { eligible: false, reason: 'Offer exhausted' };
    }

    // 3. Per-user limit check
    if (user && coupon.maxUsesPerUser > 0) {
      const timesUsed = coupon.usedBy?.filter((uid: string) => uid === user.id).length || 0;
      if (timesUsed >= coupon.maxUsesPerUser) {
        return { eligible: false, reason: 'You have reached maximum usage limit for this coupon' };
      }
    }

    // 4. Product Type Scope check
    let eligibleItems = [...items];
    if (coupon.applicableTo && coupon.applicableTo !== 'all') {
      if (coupon.applicableTo === 'products') {
        eligibleItems = items.filter(i => i.type === 'product');
        if (eligibleItems.length === 0) {
          return { eligible: false, reason: 'Applicable only on physical products' };
        }
      } else if (coupon.applicableTo === 'courses') {
        eligibleItems = items.filter(i => i.type === 'course');
        if (eligibleItems.length === 0) {
          return { eligible: false, reason: 'Applicable only on online courses' };
        }
      } else if (coupon.applicableTo === 'consultations') {
        eligibleItems = items.filter(i => i.type === 'consultation');
        if (eligibleItems.length === 0) {
          return { eligible: false, reason: 'Applicable only on expert consultations' };
        }
      }
    }

    // 5. Category Scope check
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      const hasProductsInCategories = items.some(i => {
        if (i.type !== 'product') return false;
        const details = productDetails[i.id];
        return !details || coupon.applicableCategories.includes(details.mainCategory);
      });

      if (!hasProductsInCategories) {
        return { eligible: false, reason: `Applicable only on: ${coupon.applicableCategories.join(', ')}` };
      }

      eligibleItems = eligibleItems.filter(i => {
        if (i.type !== 'product') return true;
        const details = productDetails[i.id];
        return !details || coupon.applicableCategories.includes(details.mainCategory);
      });
    }

    // 6. Minimum purchase check (comparing qualifying items eligibleSubtotal against minOrderValue)
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (coupon.minOrderValue && eligibleSubtotal < coupon.minOrderValue) {
      return { 
        eligible: false, 
        reason: `Add ${formatPrice(coupon.minOrderValue - eligibleSubtotal)} more of qualifying items to apply` 
      };
    }

    // Calculate simulated discount
    let simulatedDiscount = 0;
    if (coupon.discountType === 'percentage') {
      simulatedDiscount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && simulatedDiscount > coupon.maxDiscount) {
        simulatedDiscount = coupon.maxDiscount;
      }
    } else {
      simulatedDiscount = coupon.discountValue;
    }

    return { eligible: true, discountAmount: Math.min(simulatedDiscount, eligibleSubtotal) };
  };

  const updateItemSize = useCartStore(state => state.updateItemSize);

  // Auto-apply coupons
  useEffect(() => {
    (async () => {
      if (items.length === 0 || appliedCoupon || !user) return;
      try {
        const allCoupons = await Db.getAll<any>('coupons');
        const autoCoupons = allCoupons.filter(c => c.autoApply && c.isActive);
        const subtotal = totalPrice();
        for (const coupon of autoCoupons) {
          const res = await Db.validateCoupon(coupon.code, user.id, items, subtotal);
          if (res.valid) {
            setAppliedCoupon({
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discountAmount: res.discountAmount || 0,
            });
            setDiscountAmount(res.discountAmount || 0);
            toast.success(`Coupon "${coupon.code}" automatically applied!`);
            break;
          }
        }
      } catch (error) {
        console.error('Auto-coupon application error:', error);
      }
    })();
  }, [items, user, appliedCoupon, totalPrice]);

  const handleApplyCoupon = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to apply coupons');
      return;
    }
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponError('');
    setIsValidatingCoupon(true);
    try {
      const res = await Db.validateCoupon(couponCode, user.id, items, totalPrice());
      if (res.valid) {
        setAppliedCoupon({
          code: res.coupon.code,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue,
          discountAmount: res.discountAmount || 0,
        });
        setDiscountAmount(res.discountAmount || 0);
        setCouponCode('');
        toast.success(`Coupon "${res.coupon.code}" applied!`);
      } else {
        setCouponError(res.error || 'Invalid coupon code');
        toast.error(res.error || 'Invalid coupon code');
      }
    } catch {
      setCouponError('Error validating coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponError('');
    toast.info('Coupon removed');
  };

  useEffect(() => {
      (async () => {
      if (items.length === 0 && !isSubmitting && !isSuccess) {
        router.push('/shop');
      }
  
      const sysSettings = await Db.getSettings<SystemSettings>('system_settings');
      if (sysSettings) {
        setShippingSettings(sysSettings.shippingSettings);
      }
      })();
  }, [items, router, isSubmitting]);

  useEffect(() => {
      (async () => {
      if (!shippingSettings) return;
  
      const hasPhysicalProducts = items.some(item => item.type === 'product');
      if (!hasPhysicalProducts) {
        setShippingCharge(0);
        return;
      }

      // Count products (Tarantulas, etc) in the cart for shipping
      let productCount = 0;
      for (const item of items) {
        if (item.type === 'product') {
          const product = await Db.getById<Product>('products', item.id);
          if (product?.mainCategory === 'Tarantulas') {
            productCount += item.quantity;
          }
        }
      }
  
      // Find applicable shipping rule
      const rule = shippingSettings.rules?.find(
        r => productCount >= r.minQuantity && productCount <= r.maxQuantity
      );
  
      setShippingCharge(rule ? rule.charge : 0);
      })();
  }, [items, shippingSettings]);

  useEffect(() => {
      (async () => {
      // Load full product details for size switching
      const details: Record<string, Product> = {};
      for (const item of items) {
        if (item.type === 'product' && !productDetails[item.id]) {
          const p = await Db.getById<Product>('products', item.id);
          if (p) details[item.id] = p;
        }
      }
      if (Object.keys(details).length > 0) {
        setProductDetails(prev => ({ ...prev, ...details }));
      }
      })();
  }, [items, productDetails]);

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setDeliveryName(user.name);
        setDeliveryPhone(user.phone || '');
      }, 0);
    }
  }, [user]);

  const handleSizeChange = (productId: string, oldSize: string, newSizeName: string) => {
    const product = productDetails[productId];
    if (!product) return;
    const newSize = product.sizes.find(s => s.size === newSizeName);
    if (newSize) {
      updateItemSize(productId, oldSize, newSize);
      toast.info(`Updated size for ${product.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast.error('Please login to place an order');
      router.push(`/login?redirect=/checkout`);
      return;
    }

    const hasPhysicalProducts = items.some(item => item.type === 'product');

    const newErrors: Record<string, string> = {};
    if (!deliveryName.trim()) newErrors.name = 'Full name is required';
    if (!deliveryPhone.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else {
      const cleanPhone = deliveryPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        newErrors.phone = 'Mobile number must be at least 10 digits';
      }
    }
    if (hasPhysicalProducts && !deliveryAddress.trim()) {
      newErrors.address = 'Delivery address is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const order: Order = {
      id: uuidv4(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        price: item.price,
        type: item.type,
        metadata: item.metadata
      })),
      status: 'pending',
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      shippingCharge,
      totalPrice: totalPrice() + shippingCharge - discountAmount,
      coupon: appliedCoupon,
      discountAmount: discountAmount,
      message,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await Db.create('orders', order);

      // Increment coupon usage if applied
      if (appliedCoupon) {
        try {
          const dbCoupon = (await Db.getAll<any>('coupons')).find(c => c.code.toUpperCase() === appliedCoupon.code.toUpperCase());
          if (dbCoupon) {
            await Db.update('coupons', dbCoupon.id, {
              usedCount: dbCoupon.usedCount + 1,
              usedBy: [...dbCoupon.usedBy, user.id]
            });
          }
        } catch (e) {
          console.error('Failed to update coupon usage count:', e);
        }
      }

      // Trigger Email Notification
      const settingsData = await Db.getSettings<SystemSettings>('system_settings');
      const paymentDetails = settingsData ? {
        upiIds: settingsData.upiIds,
        bankDetails: settingsData.bankDetails,
        paymentInstructions: settingsData.paymentInstructions
      } : null;

      if (paymentDetails) {
        const adminUser = (await Db.getAll<User>('users')).find(u => u.role === 'admin');
        const adminEmail = adminUser?.email || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'arachnidsark.store@gmail.com';

        fetch('/api/emails/order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order,
            paymentDetails,
            adminEmail
          })
        }).catch((err: Error) => console.error('Failed to trigger email:', err));
      }

      // User Notification
      addNotification({
        userId: user.id,
        title: 'Order Placed Successfully',
        message: `Your order for ${items.length} item(s) has been placed. Check your email for payment instructions.`,
        type: 'success',
        link: '/dashboard/orders',
      });

      // Admin Notification
      addNotification({
        userId: 'admin',
        title: 'New Order Received',
        message: `${user.name} placed an order for ${items.length} item(s).`,
        type: 'order',
        link: '/admin/orders',
      });

      toast.success('Order placed! Please check your email for payment instructions.');
      clearCart();
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !isSubmitting) return null;

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-[70vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-card/40 backdrop-blur-xl border border-border"
        >
          <div className="h-20 w-20 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-brand-red" />
          </div>
          <h2 className="vibe-heading text-3xl font-bold">Order Received!</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              We have sent a confirmation email with **Payment Instructions** (UPI & Bank details) to your registered email address.
            </p>
            <div className="p-4 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-bold uppercase tracking-widest">
              Please check your inbox & spam folder
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Reply to the email with your payment screenshot to complete the order.
            </p>
          </div>
          <div className="pt-6 flex flex-col gap-3">
            <Button onClick={() => router.push('/dashboard/orders')} className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-bold h-12 rounded-xl">
              View Order Status
            </Button>
            <Button variant="ghost" onClick={() => router.push('/shop')} className="w-full text-xs uppercase tracking-widest font-bold">
              Continue Shopping
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <span className="hover:text-foreground cursor-pointer" onClick={() => router.push('/shop')}>Shop</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold font-heading mb-6 flex items-center gap-3">
              <ShoppingBag className="text-brand-red h-8 w-8" />
              Complete Your <span className="text-gradient-red">Order</span>
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-accent/10 border-b border-border">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-brand-gold" />
                    {items.some(item => item.type === 'product') ? 'Delivery Information' : 'Contact Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      id="name"
                      label="Full Name *"
                      value={deliveryName}
                      onChange={(e) => setDeliveryName(e.target.value)}
                      placeholder="John Doe"
                      errorMessage={errors.name}
                      className="bg-background/50"
                    />
                    <Input
                      id="phone"
                      label="Phone Number *"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      placeholder="9876543210"
                      errorMessage={errors.phone}
                      startContent={<Phone className="h-4 w-4 text-muted-foreground" />}
                      className="bg-background/50"
                    />
                  </div>

                  {items.some(item => item.type === 'product') && (
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium">Shipping Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Street address, City, State, ZIP code"
                          className={`pl-10 min-h-[100px] ${errors.address ? 'border-red-500' : 'bg-background/50'}`}
                        />
                      </div>
                      {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">Order Note (Optional)</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Special instructions for delivery or seller..."
                      className="bg-background/50 min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-accent/10 border-b border-border">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-brand-gold" />
                    How to Pay
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-brand-gold/20 bg-brand-gold/5">
                    <CreditCard className="h-5 w-5 text-brand-gold mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Email-Based Payment</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        After placing your order request, you will receive an automated email with our <strong>UPI and Bank Transfer</strong> details.
                        To confirm your purchase, simply reply to that email with a screenshot of your payment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-accent/10 border-b border-border">
                <CardTitle className="text-lg font-heading tracking-tight uppercase text-xs">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item, idx) => {
                    const itemKey = `${item.id}-${item.type}-${item.metadata?.size || item.metadata?.duration || idx}`;
                    return (
                      <div key={itemKey} className="flex gap-3">
                        <div className="h-12 w-12 rounded bg-muted overflow-hidden border border-border flex-shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase truncate">{item.name}</p>
                          {item.scientificName && (
                            <p className="text-[10px] text-muted-foreground italic truncate">{item.scientificName}</p>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            {item.type === 'product' && item.metadata?.size ? (
                              <Select
                                value={item.metadata.size}
                                onValueChange={(val) => handleSizeChange(item.id, item.metadata?.size || '', val || '')}
                              >
                                <SelectTrigger className="h-6 w-auto min-w-[70px] text-[10px] px-2 py-0 bg-accent/50 border-none font-bold uppercase">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass border-border">
                                  {productDetails[item.id]?.sizes.map((s, sIdx) => (
                                    <SelectItem key={sIdx} value={s.size} className="text-[10px] uppercase font-bold">
                                      {s.size} - {formatPrice(s.price)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : item.type === 'consultation' ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="text-[8px] bg-brand-gold/10 border-brand-gold/20 text-brand-gold h-4 uppercase w-fit">
                                  {item.metadata?.label || 'Consultation'}
                                </Badge>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                  {item.metadata?.duration}m • {item.metadata?.urgency}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[8px] bg-brand-red/10 border-brand-red/20 text-brand-red h-4 uppercase">
                                Course
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-2 uppercase font-bold">× {item.quantity}</span>
                            <span className="text-xs font-bold text-brand-gold ml-auto">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="py-2 space-y-3">
                  <Label className="text-brand-gold uppercase tracking-widest text-[10px] font-bold flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Have a Coupon?
                  </Label>
                  {!appliedCoupon ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          placeholder="ENTER CODE"
                          className="bg-background/50 h-9 text-xs font-mono font-bold uppercase tracking-wider flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon}
                          variant="outline"
                          className="h-9 text-[10px] uppercase font-bold tracking-wider border-brand-gold/30 hover:bg-brand-gold/10 shrink-0"
                        >
                          {isValidatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-[10px] text-red-500 font-semibold px-1">{couponError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-emerald-500 animate-pulse" />
                        <div>
                          <p className="font-mono font-bold text-xs uppercase text-emerald-500 tracking-wider">
                            {appliedCoupon.code} APPLIED!
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Saved {formatPrice(appliedCoupon.discountAmount)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleRemoveCoupon}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-[9px] uppercase font-bold tracking-wider text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Available Coupons List — Swiggy/Zomato style */}
                {availableCoupons.length > 0 && !appliedCoupon && (
                  <div className="py-2 space-y-2.5">
                    <Label className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                      Available Offers
                    </Label>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                      {availableCoupons.map((coupon) => {
                        const { eligible, reason } = checkCouponEligibility(coupon);
                        return (
                          <div
                            key={coupon.id}
                            className={`rounded-lg border transition-all duration-200 relative overflow-hidden ${
                              eligible
                                ? 'border-border/60 bg-card/40 hover:border-brand-gold/50'
                                : 'border-border/40 bg-card/20 opacity-70'
                            }`}
                          >
                            {/* Voucher cutouts */}
                            <div className="absolute top-1/2 -left-1.5 h-3 w-3 rounded-full bg-background border-r border-border/40 -translate-y-1/2" />
                            <div className="absolute top-1/2 -right-1.5 h-3 w-3 rounded-full bg-background border-l border-border/40 -translate-y-1/2" />

                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              {/* Left: Coupon Info */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[10px] font-black tracking-widest uppercase rounded px-2 py-0.5 border bg-brand-gold/15 text-brand-gold border-brand-gold/30">
                                    {coupon.code}
                                  </span>
                                  {coupon.autoApply && (
                                    <span className="text-[7px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tight shrink-0">
                                      Auto
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-semibold text-foreground leading-snug">
                                  {coupon.description || `Get ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)} off`}
                                </p>
                                {coupon.minOrderValue > 0 && (
                                  <p className="text-[9px] text-muted-foreground font-medium">
                                    Min order: {formatPrice(coupon.minOrderValue)}
                                  </p>
                                )}
                                {!eligible && reason && (
                                  <p className="text-[9px] text-red-500 font-semibold mt-0.5">
                                    {reason}
                                  </p>
                                )}
                              </div>

                              {/* Right: Apply Button */}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={!eligible || isValidatingCoupon}
                                onClick={async () => {
                                  setCouponCode(coupon.code);
                                  setIsValidatingCoupon(true);
                                  try {
                                    const res = await Db.validateCoupon(coupon.code, user?.id || '', items, totalPrice());
                                    if (res.valid) {
                                      setAppliedCoupon({
                                        code: res.coupon.code,
                                        discountType: res.coupon.discountType,
                                        discountValue: res.coupon.discountValue,
                                        discountAmount: res.discountAmount || 0,
                                      });
                                      setDiscountAmount(res.discountAmount || 0);
                                      setCouponCode('');
                                      toast.success(`Coupon "${res.coupon.code}" applied!`);
                                    } else {
                                      setCouponError(res.error || 'Invalid coupon');
                                      toast.error(res.error || 'Invalid coupon');
                                    }
                                  } catch {
                                    setCouponError('Error validating coupon');
                                  } finally {
                                    setIsValidatingCoupon(false);
                                  }
                                }}
                                className={`h-8 px-4 text-[10px] uppercase font-black tracking-widest shrink-0 rounded-md border ${
                                  eligible
                                    ? 'text-brand-gold border-brand-gold/40 hover:bg-brand-gold/10'
                                    : 'text-muted-foreground/40 border-border/30 cursor-not-allowed'
                                }`}
                              >
                                {isValidatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Subtotal</span>
                    <span>{formatPrice(totalPrice())}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3.5 w-3.5" /> Coupon Discount
                      </span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {items.some(item => item.type === 'product') && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-brand-gold font-medium">{formatPrice(shippingCharge)}</span>
                      </div>
                      {shippingSettings?.disclaimer && (
                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                          {shippingSettings.disclaimer}
                        </p>
                      )}
                    </>
                  )}
                  <Separator className="bg-border/50 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-heading font-black text-2xl text-brand-gold">{formatPrice(totalPrice() + shippingCharge - discountAmount)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-bold h-12 shadow-lg shadow-brand-red/20 mt-4"
                >
                  {isSubmitting ? 'Processing...' : 'Place Order Request'}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground italic px-2">
                  By placing this order, you agree to our terms of service regarding live animal shipping.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
