'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { PriceDisplay } from '@/components/currency/price-display';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { trackProductClick } from '@/lib/analytics';
import type { ShopSortBy } from '@/lib/domain/products';
import { useShopCatalog } from '@/hooks/catalog/use-shop-catalog';

const SORT_OPTIONS: ShopSortBy[] = ['newest', 'price-asc', 'price-desc', 'name-asc', 'name-desc'];

function isShopSortBy(value: string): value is ShopSortBy {
  return SORT_OPTIONS.includes(value as ShopSortBy);
}

export function ShopContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    loading,
  } = useShopCatalog();

  const hasResults = products.length > 0;

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const sortParam = searchParams.get('sort');

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    if (sortParam && isShopSortBy(sortParam)) {
      setSortBy(sortParam);
    }
  }, [searchParams, setSelectedCategory, setSortBy]);

  return (
    <>
      <main className="bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-16 space-y-10">
          <div className="grid gap-4 border-b border-foreground/10 pb-6 md:grid-cols-2 md:items-end">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Category</p>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 w-full rounded-none border-2 border-[#F9F6EE] bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-[#F9F6EE] bg-background text-foreground">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="rounded-none focus:bg-foreground focus:text-background">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:justify-self-end md:w-[220px]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Sort</p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as ShopSortBy)}>
                <SelectTrigger className="h-10 w-full rounded-none border-2 border-[#F9F6EE] bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-[#F9F6EE] bg-background text-foreground">
                  <SelectItem value="newest" className="rounded-none focus:bg-foreground focus:text-background">Newest</SelectItem>
                  <SelectItem value="price-asc" className="rounded-none focus:bg-foreground focus:text-background">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc" className="rounded-none focus:bg-foreground focus:text-background">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc" className="rounded-none focus:bg-foreground focus:text-background">Name: A to Z</SelectItem>
                  <SelectItem value="name-desc" className="rounded-none focus:bg-foreground focus:text-background">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">Loading Products</p>
            </div>
          ) : !hasResults ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.sku}`}
                  className="group flex flex-col items-center"
                  onClick={() => {
                    void trackProductClick(product.id, user?.id);
                  }}
                >
                  <div className="relative w-full aspect-[3/4] bg-secondary overflow-hidden mb-5">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        quality={85}
                        loading="lazy"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        No catalog image
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">{product.sku}</p>
                    <h3 className="text-xs uppercase tracking-[0.2em] group-hover:text-muted-foreground transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{product.category} / {product.color}</p>
                    <PriceDisplay
                      amount={product.price}
                      baseCurrency="USD"
                      className="text-xs text-muted-foreground"
                      showCurrencyCode
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
