import Link from 'next/link';

export function Footer() {
  const socialLinks = [
    { href: 'https://instagram.com', label: 'Instagram' },
    { href: 'https://x.com', label: 'X' },
    { href: 'https://pinterest.com', label: 'Pinterest' },
  ];

  return (
    <footer className="border-t-2 border-foreground/40 bg-foreground text-background py-3xl" role="contentinfo">
      <div className="container mx-auto px-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3xl">
          <div className="space-y-md">
            <h3 className="font-display font-bold uppercase text-xl">Streetwear</h3>
            <p className="text-background/70 text-sm">
              Minimal fashion for the modern urbanite.
            </p>
          </div>

          <nav className="space-y-md" aria-label="Shop navigation">
            <h4 className="font-display font-bold uppercase text-sm">Shop</h4>
            <ul className="space-y-sm text-sm text-background/70">
              <li><Link href="/shop" className="hover:text-background transition-colors">All Products</Link></li>
              <li><Link href="/shop?category=All&sort=name-asc" className="hover:text-background transition-colors">Collections</Link></li>
              <li><Link href="/shop?sort=newest" className="hover:text-background transition-colors">New Arrivals</Link></li>
            </ul>
          </nav>

          <nav className="space-y-md" aria-label="About navigation">
            <h4 className="font-display font-bold uppercase text-sm">About</h4>
            <ul className="space-y-sm text-sm text-background/70">
              <li><Link href="/about" className="hover:text-background transition-colors">Our Story</Link></li>
              <li><Link href="/newsletter" className="hover:text-background transition-colors">Newsletter</Link></li>
            </ul>
          </nav>

          <nav className="space-y-md" aria-label="Social media navigation">
            <h4 className="font-display font-bold uppercase text-sm">Follow</h4>
            <ul className="space-y-sm text-sm text-background/70">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-background transition-colors"
                    aria-label={`Follow us on ${link.label}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-3xl pt-xl border-t border-background/20 text-center text-sm text-background/60">
          <p>&copy; {new Date().getFullYear()} Streetwear. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}