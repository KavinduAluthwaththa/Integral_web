'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/navigation/header';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/lib/cart-context';

interface SizeChartProduct {
  id: string;
  sku: string;
  name: string;
  size_chart_images: string[];
  images?: string[];
}

export default function SizeChartPage() {
  const params = useParams();
  const sku = params?.sku as string;
  const { uniqueItemCount } = useCart();

  const [product, setProduct] = useState<SizeChartProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSizeChart = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, size_chart_images, images, is_hidden')
        .eq('sku', sku)
        .eq('is_hidden', false)
        .maybeSingle();

      if (!isActive) return;

      if (error || !data) {
        setProduct(null);
      } else {
        setProduct({
          id: data.id,
          sku: data.sku,
          name: data.name,
          size_chart_images: (data as any)?.size_chart_images || [],
          images: (data as any)?.images || [],
        });
      }

      setLoading(false);
    };

    if (sku) {
      void loadSizeChart();
    }

    return () => {
      isActive = false;
    };
  }, [sku]);

  const hasCharts = (product?.size_chart_images || []).length > 0;

  if (loading) {
    return (
      <>
        <Header cartCount={uniqueItemCount} onCartClick={() => setIsCartOpen(true)} onSearchClick={() => {}} />
        <main className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Loading size chart...</p>
        </main>
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Header cartCount={uniqueItemCount} onCartClick={() => setIsCartOpen(true)} onSearchClick={() => {}} />
      <main className="bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 space-y-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Size Chart</p>
              <h1 className="text-3xl font-light tracking-wide uppercase">
                {product?.name || 'Size chart unavailable'}
              </h1>
              {product?.sku ? (
                <p className="text-sm text-muted-foreground">Measurements for {product.sku}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={product?.sku ? `/product/${product.sku}` : '/shop'}>
                <Button variant="outline">Back to product</Button>
              </Link>
              <Link href="/shop">
                <Button>Continue shopping</Button>
              </Link>
            </div>
          </div>

          {!hasCharts ? (
            <div className="border-2 border-dashed border-foreground/20 bg-muted/30 px-6 py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No size chart images available yet.</p>
              <p className="text-xs text-muted-foreground">Check back soon or contact support if you need sizing help.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {product?.size_chart_images?.map((image, index) => {
                const isAboveTheFold = index === 0;
                return (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-[3/4] overflow-hidden border border-foreground/10 bg-secondary"
                  >
                    <Image
                      src={image}
                      alt={`${product?.name || 'Product'} size chart ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading={isAboveTheFold ? 'eager' : 'lazy'}
                      priority={isAboveTheFold}
                      className="object-contain"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
