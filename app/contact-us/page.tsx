'use client';

import { Navbar } from '@/components/navigation/navbar';

export default function ContactUsPage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="bg-background text-foreground">
        <section className="border-b border-foreground/10 py-4xl">
          <div className="container mx-auto max-w-4xl space-y-lg px-md">
            <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Support</p>
            <h1 className="text-4xl font-light tracking-tight md:text-5xl">Contact Us</h1>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Questions about sizing, shipping, or your order? Our support team is here to help.
            </p>
          </div>
        </section>

        <section className="py-3xl">
          <div className="container mx-auto max-w-4xl space-y-xl px-md">
            <div className="space-y-xs text-muted-foreground">
              <p>Email: support@integralwear.com</p>
              <p>Hours: Monday-Friday, 9:00 AM - 6:00 PM</p>
              <p>Response time: within 1 business day</p>
            </div>

            <form className="grid gap-md md:grid-cols-2" action="/api/contact" method="post">
              <input
                type="text"
                name="name"
                required
                placeholder="Your name"
                className="h-11 border border-foreground/30 bg-transparent px-md text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <input
                type="email"
                name="email"
                required
                placeholder="Your email"
                className="h-11 border border-foreground/30 bg-transparent px-md text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <textarea
                name="message"
                required
                placeholder="How can we help?"
                className="min-h-[140px] border border-foreground/30 bg-transparent px-md py-sm text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none md:col-span-2"
              />
              <button
                type="submit"
                className="h-11 border border-foreground px-lg text-xs uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background md:col-span-2 md:w-fit"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
