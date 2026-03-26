'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="bg-background text-foreground">
        <section className="pt-4xl pb-3xl border-b border-foreground/10">
          <div className="container mx-auto px-md space-y-lg max-w-5xl">
            <p className="font-display text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Our Story</p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">Intentional streetwear for everyday movement.</h1>
            <p className="max-w-3xl text-base md:text-lg leading-relaxed text-muted-foreground">
              We started with a simple idea: make fewer pieces that do more. Each drop is engineered for versatility, comfort, and a clean aesthetic that pairs with anything. No loud logos—just thoughtful details, precise fits, and fabrics that age with you.
            </p>
            <div className="flex gap-3 flex-wrap mt-4">
              <Link href="/shop">
                <Button>Shop the collection</Button>
              </Link>
              <Link href="/newsletter">
                <Button variant="outline">Join the newsletter</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-3xl border-b border-foreground/10">
          <div className="container mx-auto px-md grid gap-2xl lg:grid-cols-2 lg:items-center max-w-5xl">
            <div className="space-y-lg">
              <h2 className="text-3xl font-light tracking-tight">Design language</h2>
              <p className="text-muted-foreground leading-relaxed">
                We obsess over proportion, drape, and tactile feel. From enzyme-washed cottons to technical blends, we pick materials that hold shape, breathe well, and layer effortlessly. Subtle hardware, clean seams, and reinforced stress points keep every piece ready for daily wear.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Color stories stay neutral and seasonless so you can mix across drops. We iterate fast, but only ship when the pattern, fabric, and finish are right.
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden border-2 border-foreground/40 bg-secondary">
              <Image
                src="https://images.pexels.com/photos/1544724/pexels-photo-1544724.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Garment detail"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        <section className="py-3xl">
          <div className="container mx-auto px-md grid gap-2xl lg:grid-cols-2 lg:items-center max-w-5xl">
            <div className="relative aspect-[4/5] overflow-hidden border-2 border-foreground/40 bg-secondary order-last lg:order-first">
              <Image
                src="https://images.pexels.com/photos/3760852/pexels-photo-3760852.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Studio"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div className="space-y-lg">
              <h2 className="text-3xl font-light tracking-tight">Built responsibly</h2>
              <p className="text-muted-foreground leading-relaxed">
                Small-batch production keeps waste low and quality high. We partner with mills and factories that share our standards for fair labor and mindful resource use. Packaging is minimal and recyclable.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We’re continuously improving our footprint—testing recycled fibers, better dyes, and longer-life construction. If a piece fails, we’ll make it right.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
