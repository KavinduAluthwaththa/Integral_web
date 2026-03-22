'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/navigation/header';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Modal } from '@/components/modal/modal';
import { SearchBar } from '@/components/search/search-bar';
import { PriceDisplay } from '@/components/currency/price-display';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { trackProductClick } from '@/lib/analytics';
import { useShopCatalog } from '@/hooks/catalog/use-shop-catalog';

export default function ShopPage() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const {
    products,
    productNames,
    categories,
    colors,
    selectedCategory,
    setSelectedCategory,
    selectedColor,
    setSelectedColor,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
    loading,
  } = useShopCatalog();
  const [hasCategoryChipSelection, setHasCategoryChipSelection] = useState(false);

  const hasResults = products.length > 0;
  const paginationLabel = useMemo(() => `${page} / ${totalPages}`, [page, totalPages]);

  return (
    <>
      <Header
        cartCount={itemCount}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
      />

      <main className="bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-16 space-y-10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px] lg:items-end">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Catalog Search</p>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, category, or color"
                className="bg-background transition-colors focus-visible:bg-input focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Category</p>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground bg-background text-foreground">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="rounded-none focus:bg-foreground focus:text-background">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Color</p>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger className="h-10 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground bg-background text-foreground">
                  {colors.map((color) => (
                    <SelectItem key={color} value={color} className="rounded-none focus:bg-foreground focus:text-background">
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Sort</p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="h-10 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground bg-background text-foreground">
                  <SelectItem value="newest" className="rounded-none focus:bg-foreground focus:text-background">Newest</SelectItem>
                  <SelectItem value="price-asc" className="rounded-none focus:bg-foreground focus:text-background">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc" className="rounded-none focus:bg-foreground focus:text-background">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc" className="rounded-none focus:bg-foreground focus:text-background">Name: A to Z</SelectItem>
                  <SelectItem value="name-desc" className="rounded-none focus:bg-foreground focus:text-background">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setHasCategoryChipSelection(true);
                  }}
                  className={`px-3 py-2 font-display font-bold text-[10px] uppercase tracking-[0.25em] border transition-colors ${
                    hasCategoryChipSelection && selectedCategory === category
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground/20 text-foreground/75 hover:border-foreground hover:bg-foreground hover:text-background'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Page {paginationLabel}
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

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              className="inline-flex h-10 items-center justify-center border-2 border-foreground px-md py-sm font-display text-sm font-bold uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{paginationLabel}</span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages || loading}
              className="inline-flex h-10 items-center justify-center border-2 border-foreground px-md py-sm font-display text-sm font-bold uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Search Products" size="lg">
        <SearchBar
          suggestions={productNames}
          className="w-full"
          onSearch={(query) => {
            setSearchQuery(query);
            setPage(1);
            setIsSearchOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
