'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { supabase, ProductWithVariants } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/navigation/header';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { ImageGallery } from '@/components/product/image-gallery';
import { ProductRecommendations } from '@/components/product/product-recommendations';
import { PriceDisplay } from '@/components/currency/price-display';
import { useCart } from '@/lib/cart-context';
import { useToast } from '@/hooks/use-toast';
import { getStockInfo, StockInfo } from '@/lib/inventory';
import { getStockStatusText, getStockStatusColor } from '@/lib/inventory/stock-ui';
import { trackProductView, trackSizeSelect, trackAddToCart } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';
import {
  getProductRecommendations,
  getRecentlyViewedProducts,
  RecommendedProduct,
  recordRecentlyViewedProduct,
  trackRecommendationAddToCart,
  trackRecommendationClick,
  RecentlyViewedProduct,
} from '@/lib/recommendations';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const sku = params.sku as string;
  const { addItem, itemCount } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RecommendedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [variantStockInfo, setVariantStockInfo] = useState<Record<string, StockInfo>>({});
  const [stockRealtimeStatus, setStockRealtimeStatus] = useState<'offline' | 'connecting' | 'live' | 'error'>('offline');

  const refreshVariantStockInfo = useCallback(async (variants: ProductWithVariants['product_variants']) => {
    if (!variants?.length) {
      setVariantStockInfo({});
      return {} as Record<string, StockInfo>;
    }

    const stockEntries = await Promise.all(
      variants.map(async (variant) => [variant.id, await getStockInfo(variant.id)] as const)
    );

    const nextStockInfo = Object.fromEntries(stockEntries) as Record<string, StockInfo>;
    setVariantStockInfo(nextStockInfo);
    return nextStockInfo;
  }, []);

  const loadProduct = useCallback(async () => {
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
      await recordRecentlyViewedProduct(productData.id, user?.id);

      if (productData.product_variants && productData.product_variants.length > 0) {
        const stockInfoMap = await refreshVariantStockInfo(productData.product_variants);

        const inStockVariant = productData.product_variants.find((v: any) => {
          const info = stockInfoMap[v.id];
          return info && !info.isOutOfStock;
        });

        if (inStockVariant) {
          setSelectedSize(inStockVariant.size);
        }
      }

      if (user?.id) {
        const { data: favorite } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productData.id)
          .maybeSingle();

        setIsFavorite(Boolean(favorite?.id));
        setFavoriteId(favorite?.id || null);
      } else {
        setIsFavorite(false);
        setFavoriteId(null);
      }

      const [recommendedProducts, viewedProducts] = await Promise.all([
        getProductRecommendations({
          currentProduct: productData,
          userId: user?.id,
          limit: 4,
        }),
        getRecentlyViewedProducts({
          userId: user?.id,
          excludeProductId: productData.id,
          limit: 3,
        }),
      ]);

      setRelatedProducts(recommendedProducts);
      setRecentlyViewed(viewedProducts);

    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshVariantStockInfo, sku, user?.id]);

  useEffect(() => {
    if (sku) {
      void loadProduct();
    }
  }, [loadProduct, sku]);

  useEffect(() => {
    if (!product?.id || !product.product_variants?.length) {
      setStockRealtimeStatus('offline');
      return;
    }

    setStockRealtimeStatus('connecting');
    const variantIdSet = new Set(product.product_variants.map((variant) => variant.id));

    const refreshStockInfo = () => {
      void refreshVariantStockInfo(product.product_variants || []);
    };

    const channel = supabase
      .channel(`stock-live-${product.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_variants',
          filter: `product_id=eq.${product.id}`,
        },
        refreshStockInfo
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_reservations',
        },
        (payload: any) => {
          const variantId = payload?.new?.variant_id || payload?.old?.variant_id;
          if (variantId && variantIdSet.has(variantId)) {
            refreshStockInfo();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStockRealtimeStatus('live');
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setStockRealtimeStatus('error');
          return;
        }

        if (status === 'CLOSED') {
          setStockRealtimeStatus('offline');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setStockRealtimeStatus('offline');
    };
  }, [product?.id, product?.product_variants, refreshVariantStockInfo]);

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
      await trackRecommendationAddToCart(product.id, user?.id);

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

  const handleFavoriteToggle = async () => {
    if (!product || isFavoriteLoading) return;

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save favorites.',
      });
      router.push('/login');
      return;
    }

    try {
      setIsFavoriteLoading(true);

      if (isFavorite && favoriteId) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('id', favoriteId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsFavorite(false);
        setFavoriteId(null);
        toast({
          title: 'Removed from favorites',
          description: `${product.name} was removed from your favorites.`,
        });
        return;
      }

      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          product_id: product.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      setIsFavorite(true);
      setFavoriteId(data.id);
      toast({
        title: 'Added to favorites',
        description: `${product.name} was saved to your favorites.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to update favorites',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const stockRealtimeLabel =
    stockRealtimeStatus === 'live'
      ? 'Live stock updates active'
      : stockRealtimeStatus === 'connecting'
      ? 'Connecting live stock updates...'
      : stockRealtimeStatus === 'error'
      ? 'Live stock updates unavailable'
      : 'Stock updates require refresh';

  if (loading) {
    return (
      <>
        <Header
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
        <Header
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
      <Header
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
              <PriceDisplay
                amount={product.price}
                baseCurrency={product.currency || 'USD'}
                className="text-2xl font-light mb-6 block"
              />

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
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {stockRealtimeLabel}
                </p>
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
                            : 'border border-foreground/20 text-foreground/75 hover:border-foreground hover:bg-foreground hover:text-background'
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
                  onClick={handleFavoriteToggle}
                  disabled={isFavoriteLoading}
                  className="w-full flex items-center justify-center gap-2 border border-foreground/20 py-3 text-xs tracking-[0.2em] uppercase text-foreground/75 transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={isFavorite}
                >
                  <Heart
                    size={14}
                    strokeWidth={1.5}
                    className={isFavorite ? 'fill-foreground' : ''}
                  />
                  {isFavoriteLoading ? 'Saving...' : isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
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

          <ProductRecommendations
            relatedProducts={relatedProducts}
            recentlyViewed={recentlyViewed}
            sourceProductId={product.id}
            userId={user?.id}
            onRecommendationClick={(recommendedProductId, sourceProductId, recommendationUserId) => {
              void trackRecommendationClick({
                recommendedProductId,
                sourceContext: 'product_page',
                sourceProductId,
                userId: recommendationUserId,
              });
            }}
          />
        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
