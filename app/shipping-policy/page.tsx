'use client';

import { Navbar } from '@/components/navigation/navbar';

export default function ShippingPolicyPage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="bg-background text-foreground">
        <section className="border-b border-foreground/10 py-4xl">
          <div className="container mx-auto max-w-4xl space-y-lg px-md">
            <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Support</p>
            <h1 className="text-4xl font-light tracking-tight md:text-5xl">Shipping Policy</h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Orders are packed within 1-2 business days and dispatched with tracking to keep you informed.
            </p>
          </div>
        </section>

        <section className="py-3xl">
          <div className="container mx-auto max-w-4xl space-y-xl px-md">
            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">Delivery Windows</h2>
              <ul className="list-disc space-y-xs pl-5 text-muted-foreground">
                <li>Local deliveries: 2-4 business days after dispatch.</li>
                <li>International deliveries: 5-12 business days after dispatch.</li>
                <li>Remote-area delivery may require additional carrier time.</li>
              </ul>
            </div>

            <div className="space-y-sm">
              <h2 className="text-2xl font-light tracking-tight">Tracking &amp; Support</h2>
              <p className="text-muted-foreground">
                A tracking link is sent once your order ships. If tracking stalls for more than 3 business days,
                contact support and we will investigate with the carrier.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">Shipping rates are shown at checkout before payment.</p>
          </div>
        </section>
      </main>
    </>
  );
}
