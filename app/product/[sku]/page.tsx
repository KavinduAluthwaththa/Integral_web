'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase, ProductWithVariants } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navigation/navbar';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { ImageGallery } from '@/components/product/image-gallery';
import { useCart } from '@/lib/cart-context';
import { useToast } from '@/hooks/use-toast';
import { getStockInfo, getStockStatusText, getStockStatusColor, StockInfo } from '@/lib/inventory';
import { trackProductView, trackSizeSelect, trackAddToCart } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';

export default function ProductPage() {
  const params = useParams();
  const sku = params.sku as string;
  const { addItem, itemCount } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithVariants[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<ProductWithVariants[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [variantStockInfo, setVariantStockInfo] = useState<Record<string, StockInfo>>({});

  useEffect(() => {
    if (sku) {
      loadProduct();
    }
  }, [sku]);

  const loadProduct = async () => {
    try {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (*)
        `)
        .eq('sku', sku)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) return;

      setProduct(productData as ProductWithVariants);

      await trackProductView(productData.id, user?.id);

      if (productData.product_variants && productData.product_variants.length > 0) {
        const stockInfoMap: Record<string, StockInfo> = {};

        for (const variant of productData.product_variants) {
          const stockInfo = await getStockInfo(variant.id);
          stockInfoMap[variant.id] = stockInfo;
        }

        setVariantStockInfo(stockInfoMap);

        const inStockVariant = productData.product_variants.find((v: any) => {
          const info = stockInfoMap[v.id];
          return info && !info.isOutOfStock;
        });

        if (inStockVariant) {
          setSelectedSize(inStockVariant.size);
        }
      }

      const { data: related } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (*)
        `)
        .eq('category', productData.category)
        .neq('id', productData.id)
        .limit(4);

      if (related) {
        setRelatedProducts(related as ProductWithVariants[]);
      }

      const storedViewed = localStorage.getItem('recentlyViewed');
      if (storedViewed) {
        const viewedIds = JSON.parse(storedViewed).filter((id: string) => id !== productData.id).slice(0, 3);

        if (viewedIds.length > 0) {
          const { data: viewedProducts } = await supabase
            .from('products')
            .select(`
              *,
              product_variants (*)
            `)
            .in('id', viewedIds);

          if (viewedProducts) {
            setRecentlyViewed(viewedProducts as ProductWithVariants[]);
          }
        }
      }

      const allViewed = storedViewed ? JSON.parse(storedViewed) : [];
      const updatedViewed = [productData.id, ...allViewed.filter((id: string) => id !== productData.id)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updatedViewed));

    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVariant = product?.product_variants?.find((v) => v.size === selectedSize);
  const selectedStockInfo = selectedVariant ? variantStockInfo[selectedVariant.id] : null;
  const isOutOfStock = !selectedVariant || selectedStockInfo?.isOutOfStock || false;

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || isOutOfStock || isAddingToCart) return;

    const currentStockInfo = await getStockInfo(selectedVariant.id);

    if (currentStockInfo.isOutOfStock) {
      toast({
        title: 'Out of stock',
        description: 'This item is no longer available.',
        variant: 'destructive',
      });
      setVariantStockInfo(prev => ({
        ...prev,
        [selectedVariant.id]: currentStockInfo
      }));
      return;
    }

    if (currentStockInfo.available < 1) {
      toast({
        title: 'Insufficient stock',
        description: 'Not enough stock available for this item.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      await addItem({
        product_id: product.id,
        variant_id: selectedVariant.id,
        name: product.name,
        price: product.price,
        size: selectedSize,
        quantity: 1,
        image: product.images[0],
        sku: product.sku,
      });

      await trackAddToCart(product.id, selectedVariant.id, selectedSize, user?.id);

      toast({
        title: 'Added to cart',
        description: `${product.name} (${selectedSize}) has been added to your cart`,
      });

      const updatedStockInfo = await getStockInfo(selectedVariant.id);
      setVariantStockInfo(prev => ({
        ...prev,
        [selectedVariant.id]: updatedStockInfo
      }));

      setIsCartOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar
          cartCount={itemCount}
          onCartClick={() => setIsCartOpen(true)}
          onSearchClick={() => {}}
        />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-pulse text-muted-foreground text-xs tracking-[0.3em] uppercase">Loading</div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar
          cartCount={itemCount}
          onCartClick={() => setIsCartOpen(true)}
          onSearchClick={() => {}}
        />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-2xl">
            <h1 className="text-2xl font-light tracking-wide">Product Not Found</h1>
            <Link href="/shop">
              <Button variant="outline" size="lg">Back to Shop</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar
        cartCount={itemCount}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => {}}
      />

      <main className="bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-3 text-[11px] text-muted-foreground tracking-[0.2em] uppercase">
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <span>/</span>
            <span>{product.category}</span>
          </div>

          {/* Product Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 xl:gap-20 items-start">
            {/* Left: Image Gallery */}
            <div>
              <ImageGallery images={product.images} productName={product.name} />
            </div>

            {/* Right: Product Info */}
            <div className="lg:sticky lg:top-24 space-y-0">
              {/* Artist / Brand label */}
              <p className="text-xs text-muted-foreground tracking-widest mb-2 font-light italic">
                by Streetwear
              </p>

              {/* Name */}
              <h1 className="text-3xl md:text-4xl font-light tracking-wide uppercase mb-6 leading-tight">
                {product.name}
              </h1>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Price */}
              <p className="text-2xl font-light mb-6">
                ${product.price.toFixed(2)}
              </p>

              {/* Color Row */}
              <div className="flex items-center justify-between border-t border-foreground/10 py-4">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Color</span>
                <span className="text-xs uppercase tracking-widest font-medium">{product.color}</span>
              </div>

              {/* Size Selector */}
              <div className="py-4 border-t border-foreground/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Size</span>
                  {selectedVariant && variantStockInfo[selectedVariant.id] && (
                    <span className={`text-xs tracking-wide ${getStockStatusColor(variantStockInfo[selectedVariant.id])}`}>
                      {getStockStatusText(variantStockInfo[selectedVariant.id])}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants?.map((variant) => {
                    const stockInfo = variantStockInfo[variant.id];
                    const variantOutOfStock = stockInfo?.isOutOfStock || false;
                    const isSelected = selectedSize === variant.size;

                    return (
                      <button
                        key={variant.id}
                        onClick={() => {
                          if (!variantOutOfStock) {
                            setSelectedSize(variant.size);
                            trackSizeSelect(product.id, variant.id, variant.size, user?.id);
                          }
                        }}
                        disabled={variantOutOfStock}
                        className={`relative min-w-[48px] px-3 py-2 text-xs tracking-widest transition-all ${
                          isSelected
                            ? 'bg-foreground text-background'
                            : variantOutOfStock
                            ? 'opacity-20 cursor-not-allowed line-through border border-foreground/10'
                            : 'border border-foreground/20 hover:border-foreground/60 text-foreground'
                        }`}
                      >
                        {variant.size}
                        {stockInfo?.isLowStock && !variantOutOfStock && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Limited edition note */}
              <div className="py-3 border-t border-foreground/10">
                <p className="text-xs text-muted-foreground">
                  This collection is <strong className="text-foreground font-semibold">limited edition</strong>.
                </p>
              </div>

              {/* Add to Cart */}
              <div className="pt-4 space-y-3">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full text-xs tracking-[0.2em] uppercase font-medium"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAddingToCart}
                >
                  {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                </Button>

                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs tracking-[0.2em] uppercase border-b border-foreground/20 hover:border-foreground/50 transition-colors text-foreground/70 hover:text-foreground"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={isFavorite}
                >
                  <Heart
                    size={14}
                    strokeWidth={1.5}
                    className={isFavorite ? 'fill-foreground' : ''}
                  />
                  Add to Favorites
                </button>
              </div>

              {/* Accordion Details */}
              <div className="pt-4 space-y-0 border-t border-foreground/10">
                <details className="group border-b border-foreground/10">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-xs uppercase tracking-widest">
                    <span>Details</span>
                    <span className="text-foreground/40 group-open:hidden">+</span>
                    <span className="text-foreground/40 hidden group-open:inline">−</span>
                  </summary>
                  <div className="pb-4 text-xs text-muted-foreground leading-relaxed">
                    <p>Premium quality materials. Crafted with intention and built to last. SKU: {product.sku}</p>
                  </div>
                </details>
                <details className="group border-b border-foreground/10">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-xs uppercase tracking-widest">
                    <span>Shipping</span>
                    <span className="text-foreground/40 group-open:hidden">+</span>
                    <span className="text-foreground/40 hidden group-open:inline">−</span>
                  </summary>
                  <div className="pb-4 text-xs text-muted-foreground leading-relaxed">
                    <p>Free standard shipping on orders over $100. Express and international options available at checkout.</p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-24 pt-12 border-t border-foreground/10">
              <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">You May Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((related) => (
                  <Link key={related.id} href={`/product/${related.sku}`} className="group">
                    <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-4">
                      <Image
                        src={related.images[0]}
                        alt={related.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs uppercase tracking-wider mb-1">{related.name}</h3>
                      <p className="text-xs text-muted-foreground">${related.price.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <div className="mt-20 pt-12 border-t border-foreground/10">
              <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">Recently Viewed</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {recentlyViewed.map((viewed) => (
                  <Link key={viewed.id} href={`/product/${viewed.sku}`} className="group">
                    <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-4">
                      <Image
                        src={viewed.images[0]}
                        alt={viewed.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs uppercase tracking-wider mb-1">{viewed.name}</h3>
                      <p className="text-xs text-muted-foreground">${viewed.price.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
