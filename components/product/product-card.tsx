'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FavoriteIcon } from '@/components/icons/cart-icon';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from '@/components/currency/price-display';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
  currency?: string;
  onAddToCart?: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
  className?: string;
}

export function ProductCard({
  id,
  name,
  price,
  image,
  category,
  currency = 'USD',
  onAddToCart,
  onFavorite,
  isFavorited = false,
  className,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article className={cn('group', className)} aria-label={`Product: ${name}`}>
      <div className="relative aspect-square bg-secondary overflow-hidden border-2 border-foreground/40">
        {/* Image Container */}
        <div className="relative w-full h-full">
          <Image
            src={image}
            alt={`${name} - ${category || 'Product'}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
            loading="lazy"
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              imageLoaded && 'opacity-100',
              !imageLoaded && 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
          )}
        </div>

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end p-md opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="accent"
            className="w-full"
            onClick={() => onAddToCart?.(id)}
          >
            Add to Cart
          </Button>
        </div>

        {/* Favorite Button */}
        <div className="absolute top-md right-md">
          <button
            onClick={() => onFavorite?.(id)}
            className="bg-background border-2 border-foreground/40 p-sm hover:bg-secondary transition-colors"
            aria-label={isFavorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
            aria-pressed={isFavorited}
          >
            <FavoriteIcon isActive={isFavorited} />
          </button>
        </div>

        {/* Category Badge */}
        {category && (
          <div className="absolute top-md left-md">
            <span className="bg-background border border-foreground px-sm py-xs text-xs font-display uppercase font-bold">
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-md space-y-sm">
        <h3 className="font-display font-bold uppercase text-sm leading-tight hover:opacity-75 transition-opacity cursor-pointer">
          {name}
        </h3>
        <PriceDisplay
          amount={price}
          baseCurrency={currency}
          className="font-display font-bold uppercase text-lg text-foreground"
        />
      </div>
    </article>
  );
}
