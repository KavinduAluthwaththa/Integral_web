'use client';

import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { Button } from '@/components/ui/button';

export default function CheckoutCancelPage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-2xl mx-auto px-xl text-center space-y-6">
          <h1 className="text-3xl font-light tracking-wide">Payment Cancelled</h1>
          <p className="text-muted-foreground text-sm">
            Your payment was cancelled. You can resume checkout or update your cart before trying again.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/checkout">
              <Button>Return to Checkout</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}