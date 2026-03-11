'use client';

import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { NewsletterSignup } from '@/components/newsletter/newsletter-signup';

export default function NewsletterPage() {
  const { itemCount } = useCart();

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-light tracking-wide mb-4">Stay Connected</h1>
              <p className="text-lg text-muted-foreground">
                Join our community and be the first to know about new collections, exclusive offers, and style inspiration.
              </p>
            </div>

            <div className="flex justify-center">
              <NewsletterSignup />
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 border border-foreground/10">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="font-medium mb-2">Exclusive Access</h3>
                <p className="text-sm text-muted-foreground">
                  Get early access to new collections and limited editions before they sell out.
                </p>
              </div>

              <div className="text-center p-6 border border-foreground/10">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-medium mb-2">Special Offers</h3>
                <p className="text-sm text-muted-foreground">
                  Receive subscriber-only discounts and promotional codes throughout the year.
                </p>
              </div>

              <div className="text-center p-6 border border-foreground/10">
                <div className="text-4xl mb-4">👗</div>
                <h3 className="font-medium mb-2">Style Tips</h3>
                <p className="text-sm text-muted-foreground">
                  Discover the latest trends and get expert styling advice delivered to your inbox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
