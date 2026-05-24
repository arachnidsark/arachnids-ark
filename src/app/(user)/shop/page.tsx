'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, X, Bug, SlidersHorizontal, ShoppingCart, Heart } from 'lucide-react';
import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { TabMolecule, type TabOption } from '@/components/shared/molecules/tabs';
import { Modal } from '@/components/shared/molecules/modal';
import { EmptyState } from '@/components/shared/molecules/empty-state';
import { ProductCard } from '@/components/shared/molecules/product-card';
import { Select as SharedSelect } from '@/components/shared/atoms/select';
import { Loading } from '@/components/shared/molecules/loading';
import { Db } from '@/lib/db';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { useFavoriteStore } from '@/store/favorite-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatPrice } from '@/constants/pricing';
import type { Product, CareLevel, Category } from '@/types';

const CARE_LEVELS: { value: CareLevel | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

function FilterPanel({ 
  categoryDef,
  customFilters,
  setCustomFilters,
  careLevel, setCareLevel, 
  sortBy, setSortBy, 
  onReset
}: any) {

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Care Level</label>
        <SharedSelect 
          options={CARE_LEVELS} 
          value={careLevel} 
          onValueChange={(val) => setCareLevel(val ?? '')} 
          placeholder="All Levels" 
        />
      </div>

      {categoryDef?.fields
        .filter((f: any) => f.type === 'select')
        .map((field: any) => (
          <div key={field.id} className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{field.label}</label>
            <SharedSelect 
              options={[{ value: '', label: `All ${field.label}s` }, ...(field.options || []).map((o: string) => ({ value: o, label: o }))]}
              value={customFilters[field.id] || ''} 
              onValueChange={(val) => setCustomFilters((prev: any) => ({ ...prev, [field.id]: val ?? '' }))} 
              placeholder={`All ${field.label}s`} 
            />
          </div>
        ))}

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Sort By</label>
        <SharedSelect 
          options={[
            { label: "Name", value: "" },
            { label: "Price: Low to High", value: "price-low" },
            { label: "Price: High to Low", value: "price-high" },
            { label: "Newest Arrivals", value: "newest" }
          ]} 
          value={sortBy} 
          onValueChange={(val) => setSortBy(val ?? '')} 
        />
      </div>

      <div className="pt-4">
        <Button 
          variant="outline" 
          onClick={onReset} 
          className="w-full h-12 border-brand-red/20 text-brand-red hover:bg-brand-red/5 font-bold uppercase tracking-widest text-xs rounded-xl"
        >
          <X className="h-4 w-4 mr-2" /> Reset All Filters
        </Button>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { likedIds, toggleLike, isLiked } = useFavoriteStore();
  const [search, setSearch] = useState('');
  const [mainCategory, setMainCategory] = useState<string>('All');
  
  const [careLevel, setCareLevel] = useState('');
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  
  const [sortBy, setSortBy] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [quickSelectProduct, setQuickSelectProduct] = useState<Product | null>(null);
  const [selectedQuickSize, setSelectedQuickSize] = useState<number>(0);
  const [showLeftShade, setShowLeftShade] = useState(false);
  const [showRightShade, setShowRightShade] = useState(false);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const checkScroll = async () => {
    const el = tabsListRef.current;
    if (el) {
      setShowLeftShade(el.scrollLeft > 10);
      setShowRightShade(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  useEffect(() => {
    setTimeout(async () => {
      const [prods, cats] = await Promise.all([
        Db.getAll<Product>('products'),
        Db.getAll<Category>('categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    }, 300);
  }, []);

  const CATEGORIES: TabOption[] = useMemo(() => {
    const tabs: TabOption[] = [{ value: 'All', label: 'All', icon: Bug }];
    categories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(c => tabs.push({ value: c.name, label: c.name, icon: Bug }));
    return tabs;
  }, [categories]);

  const categoryDef = useMemo(() => categories.find(c => c.name === mainCategory), [categories, mainCategory]);

  const handleLike = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to save favorites', {
        action: { label: 'Login', onClick: () => router.push('/login') },
      });
      return;
    }

    const { user } = useAuthStore.getState();
    await toggleLike(productId, 'product', user?.id);
    
    // Refresh the local products list to update like count (UI only)
    const currentIsLiked = isLiked(productId, 'product');
    setProducts(prev => prev.map(p => {
        if (p.id === productId) {
            const delta = currentIsLiked ? -1 : 1;
            return { ...p, likes: Math.max(0, (p.likes || 0) + delta) };
        }
        return p;
    }));
  };

  useEffect(() => {
    setCustomFilters({});
    setCareLevel('');
  }, [mainCategory]);

  const filtered = useMemo(() => {
    let result = products.filter(p => p.isVisible !== false && (mainCategory === 'All' || p.mainCategory === mainCategory));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.scientificName.toLowerCase().includes(q));
    }
    if (careLevel) result = result.filter(p => p.careLevel === careLevel);
    
    // Apply custom filters
    Object.entries(customFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(p => {
          if (p.customMeta && p.customMeta[key] === value) return true;
          // Legacy check
          if (p.tarantulaMeta && (p.tarantulaMeta as any)[key] === value) return true;
          if (p.scorpionMeta && (p.scorpionMeta as any)[key] === value) return true;
          if (p.centipedeMeta && (p.centipedeMeta as any)[key] === value) return true;
          return false;
        });
      }
    });

    const getMinPrice = (p: Product) => (p.sizes?.length > 0 ? Math.min(...p.sizes.map(s => s.price)) : 0);
    const sort = sortBy || 'name';
    switch (sort) {
      case 'price-low': result.sort((a, b) => getMinPrice(a) - getMinPrice(b)); break;
      case 'price-high': result.sort((a, b) => getMinPrice(b) - getMinPrice(a)); break;
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      default: result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [products, search, mainCategory, careLevel, customFilters, sortBy]);

  const clearFilters = () => {
    setCustomFilters({}); setCareLevel(''); setSearch(''); setSortBy('');
  };

  const activeFilters = [careLevel, search, ...Object.values(customFilters)].filter(Boolean).length;

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); e.stopPropagation();
    if (product.sizes.length > 1) {
      setQuickSelectProduct(product); setSelectedQuickSize(0); return;
    }
    const size = product.sizes[0];
    addItem(product, 'product', { size, quantity: 1 });
    toast.success(`${product.name} added to cart`, { icon: <ShoppingCart className="h-4 w-4" /> });
  };

  const handleQuickAdd = () => {
    if (!quickSelectProduct) return;
    const size = quickSelectProduct.sizes[selectedQuickSize];
    addItem(quickSelectProduct, 'product', { size, quantity: 1 });
    toast.success(`${quickSelectProduct.name} added to cart`, { icon: <ShoppingCart className="h-4 w-4" /> });
    setQuickSelectProduct(null);
  };

  return (
    <div className="container mx-auto px-4 py-4">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
        <TabMolecule
          options={CATEGORIES}
          value={mainCategory}
          onValueChange={setMainCategory}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-row items-center gap-2 sm:gap-3 mb-6">
        <div className="flex-1">
          <Input 
            placeholder={`Search ${mainCategory.toLowerCase()}...`} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="bg-card/40 border-border" 
            startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            isClearable
            onClear={() => setSearch('')}
          />
        </div>

        <div className="hidden md:flex gap-2">
          <SharedSelect value={careLevel} onValueChange={(val) => setCareLevel(val ?? '')} placeholder="All Levels" className="w-[160px]" options={CARE_LEVELS} />
          
          {categoryDef?.fields
            .filter(f => f.type === 'select')
            .slice(0, 3) // Show max 3 filters in the top bar to save space
            .map(field => (
              <SharedSelect 
                key={field.id}
                value={customFilters[field.id] || ''} 
                onValueChange={(val) => setCustomFilters(prev => ({ ...prev, [field.id]: val ?? '' }))} 
                placeholder={field.label} 
                className="w-[150px]" 
                options={[{ value: '', label: `All ${field.label}s` }, ...(field.options || []).map(o => ({ value: o, label: o }))]} 
              />
          ))}
          
          <SharedSelect 
            value={sortBy} onValueChange={(val) => setSortBy(val ?? '')} 
            placeholder="Sort By" className="w-[180px]" 
            options={[
              { label: "Name", value: "" },
              { label: "Price Low → High", value: "price-low" },
              { label: "Price High → Low", value: "price-high" },
              { label: "Newest", value: "newest" }
            ]} 
          />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-brand-red hover:bg-brand-red/10 h-10 px-4 rounded-xl">
              <X className="h-4 w-4 mr-2" /> Clear
            </Button>
          )}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="md:hidden relative border-border bg-card/40"
          onClick={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilters > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-brand-red">{activeFilters}</Badge>}
        </Button>

        <Modal 
          isOpen={isFilterOpen} 
          onClose={() => setIsFilterOpen(false)}
          variant="side-right"
          title="Filters"
          dismissible={true}
        >
          <FilterPanel 
            categoryDef={categoryDef}
            customFilters={customFilters}
            setCustomFilters={setCustomFilters}
            careLevel={careLevel} setCareLevel={setCareLevel} 
            sortBy={sortBy} setSortBy={setSortBy} 
            onReset={clearFilters}
          />
        </Modal>
      </motion.div>

      <p className="text-sm text-muted-foreground mb-4">{filtered.length} {mainCategory.toLowerCase()} found</p>

      {loading ? (
        <Loading text="Hunting for specimens..." />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${mainCategory.toLowerCase()} found`} description="Try adjusting your filters or search query." action={{ label: "Clear Filters", onClick: clearFilters }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} categoryDef={categories.find(c => c.name === product.mainCategory)} isLiked={isLiked(product.id, 'product')} onLike={(e) => handleLike(e, product.id)} onAddToCart={(e) => handleAddToCart(e, product)} />
          ))}
        </div>
      )}

      <Modal 
        isOpen={!!quickSelectProduct} 
        onClose={() => setQuickSelectProduct(null)}
        variant="small"
        title="Select Size"
        footer={<Button onClick={handleQuickAdd} className="w-full bg-brand-gold hover:bg-brand-gold/90 text-black font-bold h-12">Add to Cart</Button>}
      >
        {quickSelectProduct && (
          <div className="py-4 space-y-4">
            <div className="flex gap-4 items-center mb-4">
              <div className="h-16 w-16 rounded-lg overflow-hidden border border-border"><img src={quickSelectProduct.images[0]} alt="" className="h-full w-full object-cover" /></div>
              <div><h4 className="font-bold uppercase tracking-tight">{quickSelectProduct.name}</h4><p className="text-xs text-muted-foreground italic">{quickSelectProduct.scientificName}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {quickSelectProduct.sizes.map((size, idx) => (
                <button key={idx} onClick={() => setSelectedQuickSize(idx)} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedQuickSize === idx ? 'border-brand-gold bg-brand-gold/10 ring-1 ring-brand-gold' : 'border-border bg-card/40'}`}>
                  <span className="font-medium text-sm">{size.size}</span>
                  <span className="font-bold text-brand-gold">{formatPrice(size.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
