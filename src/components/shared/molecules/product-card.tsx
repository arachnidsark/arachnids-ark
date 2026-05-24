'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bug, Heart, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/shared/atoms/button';
import { formatPrice } from '@/constants/pricing';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import type { Product } from '@/types';
import { ImageViewer } from '@/components/shared/molecules/image-viewer';

/**
 * Universal ProductCard molecule.
 * Displays product image, badges, name, price, and actions.
 */
export interface ProductCardProps {
  /** The product data */
  product: Product;
  /** Whether the product is liked by the current user */
  isLiked?: boolean;
  /** Callback for when the heart button is clicked */
  onLike?: (e: React.MouseEvent) => void;
  /** Callback for when the add to cart button is clicked */
  onAddToCart?: (e: React.MouseEvent) => void;
  /** The category definition for dynamic field rendering */
  categoryDef?: import('@/types').Category;
  /** Custom class name */
  className?: string;
}

const careLevelColors: Record<string, string> = {
  beginner: 'bg-green-500 text-black hover:bg-green-400',
  intermediate: 'bg-blue-500 text-white hover:bg-blue-400',
  advanced: 'bg-orange-500 text-black hover:bg-orange-400',
  expert: 'bg-red-500 text-white hover:bg-red-400',
};

export function ProductCard({
  product,
  isLiked,
  onLike,
  onAddToCart,
  categoryDef,
  className
}: ProductCardProps) {
  const totalStock = product.sizes?.reduce((acc, s) => acc + s.stock, 0) || 0;
  const isAvailable = product.available !== false && totalStock > 0;

  return (
    <Card className={cn(
      "vibe-card group overflow-hidden border-border bg-card/30 backdrop-blur-sm h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-brand-gold/10",
      className
    )}>
      {/* Image Area */}
      <Link 
        href={`/shop/${product.id}`} 
        className="block relative h-48 bg-gradient-to-br from-brand-red/20 via-background to-brand-gold/10 overflow-hidden"
      >
        {product.images && product.images.length > 0 ? (
          <ImageViewer
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full"
            imageClassName="transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Bug className="h-16 w-16 text-brand-red/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
        )}

        {/* Care Level Badge */}
        <Badge className={cn(
          "absolute top-3 right-3 z-10 border border-white/20 shadow-xl capitalize px-3 py-1 text-[10px] font-bold",
          careLevelColors[product.careLevel] || "bg-muted text-muted-foreground"
        )}>
          {product.careLevel}
        </Badge>

        {/* Like Button */}
        <button
          onClick={onLike}
          className={cn(
            "absolute bottom-3 right-3 z-10 p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 group/like",
            isLiked
              ? 'bg-red-500 text-white border-red-400'
              : 'bg-black/60 text-white hover:bg-black/80'
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current", !isLiked && "group-hover/like:scale-110 transition-transform")} />
        </button>

        {/* Like Count Overlay */}
        <div className="absolute bottom-3 right-14 z-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-2 py-0.5 shadow-xl">
          <span className="text-[10px] font-bold text-white flex items-center gap-1">
            <Heart className="h-2.5 w-2.5 fill-red-500 text-red-500" />
            {product.likes || 0}
          </span>
        </div>

        {/* Category Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          <Badge variant="outline" className="border-white/30 bg-black/70 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
            {product.mainCategory}
          </Badge>
          
          {/* Specific Meta Badges */}
          {categoryDef?.fields?.map(field => {
            if (!field.showAsBadge) return null;
            let value = product.customMeta?.[field.id];
            
            // Fallback to legacy
            if (!value) {
              if (product.tarantulaMeta && (product.tarantulaMeta as any)[field.id]) value = (product.tarantulaMeta as any)[field.id];
              else if (product.scorpionMeta && (product.scorpionMeta as any)[field.id]) value = (product.scorpionMeta as any)[field.id];
              else if (product.centipedeMeta && (product.centipedeMeta as any)[field.id]) value = (product.centipedeMeta as any)[field.id];
            }

            if (!value) return null;

            return (
              <Badge key={field.id} variant="outline" className="border-brand-gold/40 bg-black/80 text-brand-gold text-[9px] font-black uppercase tracking-widest backdrop-blur-md px-2 py-0.5 shadow-2xl w-fit">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </Badge>
            );
          })}
        </div>
      </Link>

      {/* Content Area */}
      <CardContent className="p-4 flex-1 flex flex-col gap-1">
        <Link href={`/shop/${product.id}`} className="group/title">
          <h3 className="font-heading font-bold text-base group-hover/title:text-brand-gold transition-colors line-clamp-1 uppercase tracking-wide truncate">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground italic line-clamp-1 truncate">
            {product.scientificName}
          </p>
        </Link>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Starts at</span>
            <span className="text-lg font-bold text-brand-gold leading-none">
              {product.sizes?.length > 0
                ? formatPrice(Math.min(...product.sizes.map(s => s.price)))
                : 'N/A'}
            </span>
          </div>

          {isAvailable ? (
            <Button
              size="sm"
              onClick={onAddToCart}
              className="bg-brand-red hover:bg-brand-red/90 text-white font-bold h-9 px-4 rounded-xl shadow-lg shadow-brand-red/10"
              leftIcon={<ShoppingCart className="h-4 w-4" />}
            >
              Add
            </Button>
          ) : (
            <Button size="sm" disabled variant="outline" className="opacity-50 h-9 rounded-xl border-border">
              Sold Out
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
