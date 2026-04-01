import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground/40 bg-foreground text-background py-3xl" role="contentinfo">
      <div className="container mx-auto px-md">
        <div className="grid grid-cols-1 gap-2xl lg:grid-cols-[1fr_1.3fr_1fr] lg:items-start">
          <div className="flex flex-col items-start gap-sm">
            <span
              className="block h-12 w-[min(100%,13rem)] shrink-0 bg-background"
              style={{
                WebkitMaskImage: "url('/brand/logo/logo.svg')",
                maskImage: "url('/brand/logo/logo.svg')",
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'left center',
                maskPosition: 'left center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
              aria-label="Integral logo"
            />
            <p className="m-0 max-w-xs text-left text-sm leading-relaxed text-background/75">
              &quot;Inspired by you to inspire you&quot;
            </p>
          </div>

          <section className="space-y-md" aria-label="Newsletter sign up">
            <h4 className="font-display text-2xl font-medium leading-tight">Raise your voice with us</h4>
            <p className="text-sm text-background/70">Sign up to our newsletter</p>
            <form className="flex w-full flex-col gap-sm sm:flex-row sm:items-end" action="/newsletter" method="get">
              <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
              <input
                id="footer-newsletter-email"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="h-10 w-full border-b border-background/40 bg-transparent px-1 text-sm text-background placeholder:text-background/45 focus:border-background focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 shrink-0 border border-background/70 px-lg text-xs uppercase tracking-wider text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Sign up
              </button>
            </form>
          </section>

          <nav className="space-y-sm lg:justify-self-end" aria-label="Support navigation">
            <ul className="space-y-sm text-sm text-background/75">
              <li><Link href="/returns-exchange" className="transition-colors hover:text-background">Returns &amp; Exchange</Link></li>
              <li><Link href="/shipping-policy" className="transition-colors hover:text-background">Shipping Policy</Link></li>
              <li><Link href="/return-policy" className="transition-colors hover:text-background">Return Policy</Link></li>
              <li><Link href="/contact-us" className="transition-colors hover:text-background">Contact Us</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-3xl pt-xl border-t border-background/20 text-center text-sm text-background/60">
          <p>&copy; {new Date().getFullYear()} integral. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}