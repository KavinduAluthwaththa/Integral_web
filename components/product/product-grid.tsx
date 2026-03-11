'use client';

import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

interface ProductGridProps {
  products: Product[];
  columns?: 1 | 2 | 3 | 4;
  onAddToCart?: (id: string) => void;
  onFavorite?: (id: string) => void;
  favoritedIds?: string[];
  className?: string;
}

export function ProductGrid({
  products,
  columns = 4,
  onAddToCart,
  onFavorite,
  favoritedIds = [],
  className,
}: ProductGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-3xl">
        <p className="text-muted-foreground text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-lg', gridClass[columns], className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          onAddToCart={onAddToCart}
          onFavorite={onFavorite}
          isFavorited={favoritedIds.includes(product.id)}
        />
      ))}
    </div>
  );
}
