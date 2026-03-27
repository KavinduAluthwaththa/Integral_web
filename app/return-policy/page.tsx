'use client';

import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';

export default function ReturnPolicyPage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="bg-background text-foreground">
        <section className="border-b border-foreground/10 py-4xl">
          <div className="container mx-auto max-w-4xl space-y-lg px-md">
            <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Support</p>
            <h1 className="text-4xl font-light tracking-tight md:text-5xl">Return Policy</h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              We want every order to feel right. If not, request a return within 14 days and we will guide you.
            </p>
          </div>
        </section>

        <section className="py-3xl">
          <div className="container mx-auto max-w-4xl space-y-xl px-md">
            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">Refund Method</h2>
              <p className="text-muted-foreground">
                Approved returns are refunded to the original payment method. Processing usually completes within
                5-10 business days after your item is received and verified.
              </p>
            </div>

            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">Non-Returnable Items</h2>
              <ul className="list-disc space-y-xs pl-5 text-muted-foreground">
                <li>Final sale and clearance products.</li>
                <li>Gift cards and digital goods.</li>
                <li>Items damaged by misuse, wear, or unauthorized alterations.</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              For full return steps, see <Link href="/returns-exchange" className="underline underline-offset-4 hover:text-foreground">Returns &amp; Exchange</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
