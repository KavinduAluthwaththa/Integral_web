'use client';

import { useState } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Modal } from '@/components/modal/modal';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { useHomeCatalog } from '@/hooks/catalog/use-home-catalog';


export default function Home() {
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { featuredProducts, productNames, loadingFeaturedProducts } = useHomeCatalog();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Subscribed: ${email}`);
    setEmail('');
  };

  return (
    <>
      <Navbar
        cartCount={itemCount}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
      />

      <main className="bg-background">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center bg-background" aria-label="Hero section">
          <div className="absolute inset-0 bg-secondary/30" aria-hidden="true" />
          <div className="relative z-10 container mx-auto px-md text-center space-y-xl py-4xl">
            <h1 className="sr-only">Integral</h1>
            <div className="mx-auto w-full max-w-[560px] md:max-w-[760px] lg:max-w-[920px]">
              <div
                className="h-[120px] w-full bg-foreground md:h-[160px] lg:h-[200px]"
                style={{
                  WebkitMaskImage: "url('/brand/logo/logo.svg')",
                  maskImage: "url('/brand/logo/logo.svg')",
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
                aria-hidden="true"
              />
            </div>
            <Button variant="default" size="lg" className="group" aria-label="Visit shop" asChild>
              <a href="/shop">
                Visit Shop
                <ArrowRight className="ml-sm transition-transform group-hover:translate-x-1" size={20} aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-4xl border-y-2 border-foreground">
          <div className="container mx-auto px-md">
            {loadingFeaturedProducts ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Loading featured products</p>
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Featured products coming soon</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                {featuredProducts.map((product, index) => (
                  <div key={product.id} className="space-y-lg">
                    <div className="relative aspect-[3/4] bg-secondary border-2 border-foreground overflow-hidden group">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          quality={85}
                          priority={index === 0}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Image coming soon
                        </div>
                      )}
                    </div>
                    <h3 className="text-center text-lg">{product.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Brand Story */}
        <section className="py-4xl">
          <div className="container mx-auto px-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3xl items-center">
              <div className="space-y-xl">
                <h2 className="text-4xl md:text-5xl">Our Philosophy</h2>
                <div className="space-y-lg text-base leading-relaxed text-muted-foreground">
                  <p>
                    We believe in the power of simplicity. Every piece is crafted with intention,
                    designed to transcend trends and seasons.
                  </p>
                  <p>
                    Our approach is rooted in minimalism, where form meets function in perfect
                    harmony. We create garments that speak through their silence.
                  </p>
                  <p>
                    Quality over quantity. Essence over excess. This is streetwear redefined.
                  </p>
                </div>
                <Link href="/about" className="inline-flex mt-4">
                  <Button variant="outline" className="group">
                    Our Story
                    <ArrowRight className="ml-sm transition-transform group-hover:translate-x-1" size={18} />
                  </Button>
                </Link>
              </div>
              <div className="relative aspect-[4/5] bg-secondary border-2 border-foreground overflow-hidden">
                <Image
                  src="https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Brand Story - Our Philosophy"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  quality={85}
                  loading="lazy"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-4xl">
          <div className="container mx-auto px-md">
            <div className="max-w-2xl mx-auto text-center space-y-xl">
              <div className="space-y-md">
                <h2 className="text-4xl md:text-5xl">Stay Connected</h2>
                <p className="text-muted-foreground text-lg">
                  Join our community for exclusive releases and editorial content.
                </p>
              </div>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-sm max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" variant="default">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-foreground bg-foreground text-background py-3xl" role="contentinfo">
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
                  <li><a href="#" className="hover:text-background transition-colors">New Arrivals</a></li>
                  <li><a href="#" className="hover:text-background transition-colors">Collections</a></li>
                  <li><a href="#" className="hover:text-background transition-colors">Sale</a></li>
                </ul>
              </nav>
              <nav className="space-y-md" aria-label="About navigation">
                <h4 className="font-display font-bold uppercase text-sm">About</h4>
                <ul className="space-y-sm text-sm text-background/70">
                  <li><a href="#" className="hover:text-background transition-colors">Our Story</a></li>
                  <li><a href="#" className="hover:text-background transition-colors">Sustainability</a></li>
                  <li><a href="#" className="hover:text-background transition-colors">Contact</a></li>
                </ul>
              </nav>
              <nav className="space-y-md" aria-label="Social media navigation">
                <h4 className="font-display font-bold uppercase text-sm">Follow</h4>
                <ul className="space-y-sm text-sm text-background/70">
                  <li><a href="#" className="hover:text-background transition-colors" aria-label="Follow us on Instagram">Instagram</a></li>
                  <li><a href="#" className="hover:text-background transition-colors" aria-label="Follow us on Twitter">Twitter</a></li>
                  <li><a href="#" className="hover:text-background transition-colors" aria-label="Follow us on Pinterest">Pinterest</a></li>
                </ul>
              </nav>
            </div>
            <div className="mt-3xl pt-xl border-t border-background/20 text-center text-sm text-background/60">
              <p>&copy; 2024 Streetwear. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Search Products"
        size="lg"
      >
        <SearchBar
          suggestions={productNames}
          className="w-full"
        />
      </Modal>
    </>
  );
}
