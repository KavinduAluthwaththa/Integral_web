'use client';

import { Navbar } from '@/components/navigation/navbar';
import HomeCombined from '@/components/landing/home-combined';
import { useState } from 'react';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { useCart } from '@/lib/cart-context';

export default function Home() {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => setIsCartOpen(true)} onSearchClick={() => {}} />
      <HomeCombined />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
