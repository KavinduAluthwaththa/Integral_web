'use client';

import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';

export default function ReturnsExchangePage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="bg-background text-foreground">
        <section className="border-b border-foreground/10 py-4xl">
          <div className="container mx-auto max-w-4xl space-y-lg px-md">
            <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Support</p>
            <h1 className="text-4xl font-light tracking-tight md:text-5xl">Returns &amp; Exchange</h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              If your item is unworn and in original condition, you can request a return or exchange within 14 days of delivery.
            </p>
          </div>
        </section>

        <section className="py-3xl">
          <div className="container mx-auto max-w-4xl space-y-xl px-md">
            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">Eligibility</h2>
              <ul className="list-disc space-y-xs pl-5 text-muted-foreground">
                <li>Items must be unused, unwashed, and with original tags attached.</li>
                <li>Final sale items and gift cards are not eligible for return.</li>
                <li>Return requests must be submitted within 14 days of delivery.</li>
              </ul>
            </div>

            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">How It Works</h2>
              <ol className="list-decimal space-y-xs pl-5 text-muted-foreground">
                <li>Submit your order number and request reason via the contact page.</li>
                <li>Our team confirms eligibility and emails return instructions.</li>
                <li>After inspection, we issue store credit, refund, or exchange shipment.</li>
              </ol>
            </div>

            <p className="text-sm text-muted-foreground">
              Need help now? Visit <Link href="/contact-us" className="underline underline-offset-4 hover:text-foreground">Contact Us</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
