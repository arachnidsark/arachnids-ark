'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Bug, Zap, Star, ChevronDown, GraduationCap, Calendar, BookOpen, ShoppingBag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Db } from '@/lib/db';
import type { Product, Course, CareGuide } from '@/types';
import { formatPrice } from '@/constants/pricing';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useFavoriteStore } from '@/store/favorite-store';
import { useReviewStore } from '@/store/review-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useModules } from '@/hooks/use-modules';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 }
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ========== HERO SECTION ==========
function HeroSection() {
  const { isVisible } = useModules();
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-web-pattern">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 via-background to-brand-gold/5 dark:from-black dark:via-background dark:to-brand-red/10" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(139, 26, 26, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(197, 150, 58, 0.08) 0%, transparent 50%)',
      }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Animated orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-brand-red/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container mx-auto px-4 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="max-w-3xl flex-1 z-20">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeIn} custom={0}>
              <Badge variant="outline" className="border-brand-gold/30 text-brand-gold mb-6 px-4 py-1.5">
                <Bug className="h-3 w-3 mr-2" />
                Premium Exotic Collection
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeIn} custom={1} className="text-4xl sm:text-5xl lg:text-8xl font-bold leading-[1] mb-6 tracking-tightest">
              Discover the <br />
              <span className="text-gradient">Exotic</span>{' '}
              <span className="text-gradient-red">Ark</span>
            </motion.h1>

            <motion.p variants={fadeIn} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Curated collection of rare species, expert care courses, and professional consultation — all in one place.
            </motion.p>

            <motion.div variants={fadeIn} custom={3} className="flex flex-wrap gap-4">
              {isVisible('products') && (
                <Link href="/shop">
                  <Button size="lg" className="vibe-button bg-brand-red hover:bg-brand-red-light text-white group px-8 py-7">
                    Explore Collection
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
              {isVisible('courses') && (
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="vibe-button border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 px-8 py-7">
                    Browse Courses
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeIn} custom={4} className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border">
              {[
                { value: '50+', label: 'Species' },
                { value: '500+', label: 'Happy Keepers' },
                { value: '15+', label: 'Expert Courses' },
                { value: '4.9★', label: 'Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-brand-gold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side Video */}
        <div className="hidden lg:block relative w-full flex-1 h-[500px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-20"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/images/heroVideo.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent pointer-events-none" />
          </motion.div>

          {/* Decorative floating elements */}
          <motion.div
            animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[5%] -right-[5%] w-32 h-32 bg-brand-red/20 rounded-full blur-3xl z-0 pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, 30, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[10%] -left-[5%] w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl z-0 pointer-events-none"
          />
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="h-6 w-6 text-muted-foreground" />
      </motion.div>
    </section>
  );
}

// ========== FEATURED TARANTULAS ==========
function FeaturedTarantulas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLiked: checkIsLiked, toggleLike } = useFavoriteStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { isVisible } = useModules();

  useEffect(() => {
      (async () => {
      setIsLoading(true);
      const all = await Db.getAll<Product>('products');
      setProducts(all.filter(p => p.featured && p.isVisible !== false).slice(0, 4));
      setIsLoading(false);
      })();
  }, []);

  const handleLike = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

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
    await toggleLike(productId, 'product', user?.id);
    
    // Refresh the local products list to update like count (UI only)
    const currentIsLiked = checkIsLiked(productId, 'product');
    setProducts(prev => prev.map(p => {
        if (p.id === productId) {
            const delta = currentIsLiked ? -1 : 1;
            return { ...p, likes: Math.max(0, (p.likes || 0) + delta) };
        }
        return p;
    }));
  };

  const careLevelColors: Record<string, string> = {
    beginner: 'bg-green-500 text-black hover:bg-green-400',
    intermediate: 'bg-blue-500 text-white hover:bg-blue-400',
    advanced: 'bg-orange-500 text-black hover:bg-orange-400',
    expert: 'bg-red-500 text-white hover:bg-red-400',
  };

  if (!isVisible('products')) return null;
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-12 md:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-red/[0.02] to-transparent" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="border-brand-red/30 text-brand-red mb-4">
            <ShoppingBag className="h-3 w-3 mr-2" />
            Featured Species
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Our <span className="text-gradient-red">Premium</span> Collection
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Hand-picked species from trusted breeders, each with verified health records and lineage documentation.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-card/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/shop/${product.id}`}>
                <Card className="vibe-card group overflow-hidden border-border bg-card/40 backdrop-blur-sm">
                  <div className="h-48 bg-gradient-to-br from-brand-red/20 via-background to-brand-gold/10 relative overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Bug className="h-16 w-16 text-brand-red/30 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className={careLevelColors[product.careLevel]}>
                        {product.careLevel}
                      </Badge>
                    </div>

                    {/* Like Button */}
                    <button
                      onClick={(e) => handleLike(e, product.id)}
                      className={`absolute bottom-3 right-3 z-10 p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 group/like ${
                        checkIsLiked(product.id, 'product') 
                          ? 'bg-red-500 text-white border-red-400' 
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${checkIsLiked(product.id, 'product') ? 'fill-current' : 'group-hover/like:scale-110 transition-transform'}`} />
                    </button>
                    
                    {/* Like Count */}
                    <div className="absolute bottom-3 right-14 z-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-2 py-0.5 shadow-xl">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1">
                        <Heart className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                        {product.likes || 0}
                      </span>
                    </div>
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      <Badge variant="outline" className="border-white/30 bg-black/70 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                        {product.mainCategory}
                      </Badge>
                      
                      {product.mainCategory === 'Tarantulas' && product.tarantulaMeta && (
                        <>
                          {product.tarantulaMeta.type && (
                            <Badge variant="outline" className="border-brand-gold/40 bg-black/80 text-brand-gold text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.tarantulaMeta.type}
                            </Badge>
                          )}
                          {product.tarantulaMeta.world && (
                            <Badge variant="outline" className="border-brand-gold/40 bg-black/80 text-brand-gold text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.tarantulaMeta.world}
                            </Badge>
                          )}
                        </>
                      )}

                      {product.mainCategory === 'Scorpions' && product.scorpionMeta && (
                        <>
                          {product.scorpionMeta.venomPotency && (
                            <Badge variant="outline" className="border-red-500/40 bg-black/80 text-red-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.scorpionMeta.venomPotency} Venom
                            </Badge>
                          )}
                          {product.scorpionMeta.habitatType && (
                            <Badge variant="outline" className="border-purple-500/40 bg-black/80 text-purple-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.scorpionMeta.habitatType}
                            </Badge>
                          )}
                        </>
                      )}

                      {product.mainCategory === 'Centipedes' && product.centipedeMeta && (
                        <>
                          {product.centipedeMeta.venomPotency && (
                            <Badge variant="outline" className="border-red-500/40 bg-black/80 text-red-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.centipedeMeta.venomPotency} Venom
                            </Badge>
                          )}
                          {product.centipedeMeta.habitatType && (
                            <Badge variant="outline" className="border-green-500/40 bg-black/80 text-green-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                              {product.centipedeMeta.habitatType}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-heading font-bold text-base group-hover:text-brand-gold transition-colors line-clamp-1 uppercase tracking-wide">{product.name}</h3>
                    <p className="text-xs text-muted-foreground italic">{product.scientificName}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-brand-gold">
                        {product.sizes?.length > 0
                          ? `Starts at ${formatPrice(Math.min(...product.sizes.map(s => s.price)))}`
                          : 'Contact for Price'}
                      </span>
                      {(() => {
                        const totalStock = product.sizes?.reduce((acc, s) => acc + s.stock, 0) || 0;
                        const isManuallyUnavailable = product.available === false;
                        return (
                          <span className={`text-xs ${(!isManuallyUnavailable && totalStock > 0) ? 'text-green-400' : 'text-red-400'}`}>
                            {isManuallyUnavailable ? 'Unavailable' : (totalStock > 0 ? `${totalStock} in stock` : 'Out of stock')}
                          </span>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
        )}

        <div className="text-center mt-10">
          <Link href="/shop">
            <Button variant="outline" className="vibe-button border-brand-red/30 text-brand-red hover:bg-brand-red/10 group px-8">
              View All Species
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ========== FEATURED COURSES ==========
function FeaturedCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isVisible } = useModules();

  useEffect(() => {
    (async () => {
    setIsLoading(true);
    const all = await Db.getAll<Course>('courses');
    setCourses(all.filter(c => c.featured).slice(0, 3));
    setIsLoading(false);
  })();
  }, []);

  if (!isVisible('courses')) return null;
  if (!isLoading && courses.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="border-brand-gold/30 text-brand-gold mb-4">
            <GraduationCap className="h-3 w-3 mr-2" />
            Expert Courses
          </Badge>
          <h2 className="vibe-heading text-3xl sm:text-4xl font-bold mb-4">
            Master <span className="text-gradient">Tarantula Care</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Learn from industry experts with comprehensive courses designed for all experience levels.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-card/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Link href={`/courses/${course.id}`}>
                <Card className="vibe-card group overflow-hidden border-border bg-card/40 backdrop-blur-sm h-full">
                  <div className="h-40 bg-gradient-to-br from-brand-gold/20 via-background to-brand-red/10 relative overflow-hidden flex items-center justify-center">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <GraduationCap className="h-12 w-12 text-brand-gold/30 group-hover:scale-110 transition-transform duration-500" />
                    )}
                    <Badge className="absolute top-3 left-3 bg-brand-gold/20 text-brand-gold border-brand-gold/30">
                      {course.difficulty}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-accent text-foreground">
                      {course.duration}
                    </Badge>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="font-semibold group-hover:text-brand-gold transition-colors">{course.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.contentPreview}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-brand-gold">{formatPrice(course.price)}</span>
                      <span className="text-xs text-brand-gold font-medium">Full Video Course</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
        )}

        <div className="text-center mt-10">
          <Link href="/courses">
            <Button variant="outline" className="border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 group">
              View All Courses
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ========== CARE GUIDES PREVIEW ==========
function CareGuidesPreview() {
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
    setIsLoading(true);
    setGuides((await Db.getAll<CareGuide>('care_guides')).slice(0, 4));
    setIsLoading(false);
  })();
  }, []);

  if (!isLoading && guides.length === 0) return null;

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="border-brand-red/30 text-brand-red mb-4">
            <BookOpen className="h-3 w-3 mr-2" />
            Care Guides
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Expert <span className="text-gradient-red">Care Advice</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Free resources to help you provide the best care for your eight-legged companions.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-card/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {guides.map((guide, i) => (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="group border-border bg-card hover:border-brand-red/20 transition-all h-full">
                <CardContent className="p-5 space-y-3">
                  <Badge variant="outline" className="text-xs border-border"> {guide.category}</Badge>
                  <h3 className="font-semibold text-sm group-hover:text-brand-gold transition-colors line-clamp-2">{guide.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3">{guide.excerpt}</p>
                  <p className="text-xs text-brand-gold">{guide.readTime}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}

// ========== CONSULTATION CTA ==========
function ConsultationCTA() {
  const { isVisible } = useModules();
  return (
    <section className="py-12 md:py-20 relative overflow-hidden">
      {!isVisible('consultations') ? null : (
      <>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-red/10 via-background to-brand-gold/10" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(139, 26, 26, 0.1) 0%, transparent 50%)',
      }} />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-8 w-8 text-brand-gold" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Need <span className="text-gradient">Expert Advice</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Book a one-on-one consultation with our experienced arachnid specialists.
            Get personalized guidance for your specific needs.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {[
              { label: '15 min', price: '₹499' },
              { label: '30 min', price: '₹899' },
              { label: '60 min', price: '₹1,499' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold text-brand-gold">{item.price}</p>
              </div>
            ))}
          </div>
          <Link href="/consultation">
            <Button size="lg" className="bg-brand-red hover:bg-brand-red-light text-white group px-8">
              Book Consultation
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
      </>
      )}
    </section>
  );
}

// ========== TESTIMONIALS ==========
function Testimonials() {
  const { reviews, loadReviews, isLoading } = useReviewStore();

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const approvedReviews = reviews.filter(r => r.status === 'approved').slice(0, 3);

  if (isLoading) {
    return (
      <section className="py-12 md:py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-card/20 animate-pulse border border-border" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (approvedReviews.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="border-brand-gold/30 text-brand-gold mb-4">
            <Star className="h-3 w-3 mr-2" />
            Community Reviews
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            What Our <span className="text-gradient">Community</span> Says
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {approvedReviews.map((review, i) => {
            const role =
              review.targetType === 'product'
                ? 'Verified Buyer'
                : review.targetType === 'course'
                ? 'Course Student'
                : 'Consultation Client';

            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="border-border bg-card h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-brand-gold text-brand-gold" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                    <div className="pt-4 border-t border-border flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        {review.userAvatar && <AvatarImage src={review.userAvatar} />}
                        <AvatarFallback className="bg-brand-red text-white text-xs">
                          {review.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{review.userName}</p>
                        <p className="text-xs text-brand-gold font-medium">{role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ========== FAQ ==========
function FAQSection() {
  const faqs = [
    { q: 'How do I purchase a tarantula?', a: 'Browse our shop, select your desired species, and click &quot;Order Request.&quot; Our team will review your request and guide you through the purchase process including payment verification.' },
    { q: 'What payment methods do you accept?', a: 'We accept UPI, bank transfers, and other digital payment methods. After placing an order request, we&apos;ll share payment details and you can upload your payment screenshot for verification.' },
    { q: 'Do you ship tarantulas across India?', a: 'Yes, we ship to most major cities across India using specialized packaging that ensures your tarantula arrives safely. Shipping is temperature-controlled and handled by experienced personnel.' },
    { q: 'What if my tarantula arrives in poor health?', a: 'We offer a live arrival guarantee. If your tarantula arrives in poor condition, contact us within 2 hours with photo/video evidence and we will arrange a replacement or refund.' },
    { q: 'Are the courses self-paced?', a: 'Yes, all courses are self-paced. Once your enrollment is approved and payment is verified, you\'ll have lifetime access to the course materials.' },
    { q: 'How does consultation booking work?', a: 'Choose your preferred duration and urgency level, select an available slot, and submit your booking. After payment verification, you\'ll receive a confirmation with meeting details.' },
  ];

  return (
    <section id="faq" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to know about buying tarantulas and using our services.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Accordion className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4 data-[state=open]:border-brand-gold/20">
                <AccordionTrigger className="text-sm font-medium text-left hover:text-brand-gold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

// ========== MAIN HOME PAGE ==========
export default function HomePage() {
  const { user, viewMode } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.role === 'admin' && viewMode === 'admin') {
      const timeoutId = setTimeout(() => {
        router.replace('/admin');
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, user, viewMode, router]);

  if (!mounted || (user?.role === 'admin' && viewMode === 'admin')) return null;

  return (
    <>
      <HeroSection />
      <FeaturedTarantulas />
      <FeaturedCourses />
      <CareGuidesPreview />
      <ConsultationCTA />
      <Testimonials />
      <FAQSection />
    </>
  );
}
