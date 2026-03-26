import { Suspense } from 'react';
import { Header } from '@/components/navigation/header';
import { ShopContent } from './shop-content';

function ShopLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">Loading Shop</p>
    </div>
  );
}

export default function ShopPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<ShopLoadingFallback />}>
        <ShopContent />
      </Suspense>
    </>
  );
}
