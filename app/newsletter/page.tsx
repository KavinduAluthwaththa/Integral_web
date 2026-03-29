'use client';

import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { NewsletterSignup } from '@/components/newsletter/newsletter-signup';
import { Sparkles, Tag, Shirt } from 'lucide-react';

export default function NewsletterPage() {
  const { uniqueItemCount } = useCart();

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background text-foreground">
        <section className="pt-4xl pb-3xl border-b border-foreground/10">
          <div className="container mx-auto px-md max-w-5xl">
            <div className="text-center space-y-3">
              <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Newsletter</p>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight">Stay connected</h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Join our community and be the first to know about new collections, exclusive offers, and style inspiration.
              </p>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-lg border-2 border-foreground/40 bg-secondary p-lg shadow-sm">
                <NewsletterSignup />
              </div>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="text-center border-2 border-foreground/10 bg-background p-lg space-y-3 shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center text-foreground/80">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-foreground/80">Exclusive Access</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get early access to new collections and limited editions before they sell out.
                </p>
              </div>

              <div className="text-center border-2 border-foreground/10 bg-background p-lg space-y-3 shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center text-foreground/80">
                  <Tag className="h-5 w-5" />
                </div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-foreground/80">Special Offers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Receive subscriber-only discounts and promotional codes throughout the year.
                </p>
              </div>

              <div className="text-center border-2 border-foreground/10 bg-background p-lg space-y-3 shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center text-foreground/80">
                  <Shirt className="h-5 w-5" />
                </div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-foreground/80">Style Tips</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Discover the latest trends and get expert styling advice delivered to your inbox.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
