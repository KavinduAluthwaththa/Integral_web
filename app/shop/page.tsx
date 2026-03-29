'use client';

import { Suspense, useState } from 'react';
import { Header } from '@/components/navigation/header';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { useCart } from '@/lib/cart-context';
import { ShopContent } from './shop-content';

function ShopLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">Loading Shop</p>
    </div>
  );
}

export default function ShopPage() {
  const { uniqueItemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <Header cartCount={uniqueItemCount} onCartClick={() => setIsCartOpen(true)} />
      <Suspense fallback={<ShopLoadingFallback />}>
        <ShopContent />
      </Suspense>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
