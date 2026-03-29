'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { Navbar } from '@/components/navigation/navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';

interface Favorite {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { uniqueItemCount } = useCart();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          price,
          images
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFavorites(data);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      void loadFavorites();
    }
  }, [user, authLoading, router, loadFavorites]);

  const removeFavorite = async (id: string) => {
    await supabase
      .from('user_favorites')
      .delete()
      .eq('id', id);

    void loadFavorites();
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background py-4xl">
          <div className="container mx-auto px-md">
            <div className="flex items-center justify-center py-5xl">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pb-3xl pt-4xl">
        <section className="container mx-auto max-w-7xl space-y-xl px-md">
          <div className="space-y-sm border-b border-foreground/10 pb-lg">
            <h1 className="text-2xl font-light tracking-wide">Favorites</h1>
            <p className="text-muted-foreground">Items you&apos;ve saved for later.</p>
          </div>

          {favorites.length === 0 ? (
            <div className="space-y-md py-5xl text-center">
              <Heart size={48} strokeWidth={1} className="mx-auto text-muted-foreground" />
              <div className="space-y-sm">
                <p className="text-lg">No favorites yet</p>
                <p className="text-muted-foreground">Start adding items to your favorites</p>
              </div>
              <Link href="/shop" className="inline-flex">
                <Button>Browse Shop</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-lg md:grid-cols-3 lg:grid-cols-4">
              {favorites.map((favorite, index) => {
                const isAboveTheFold = index === 0;
                return (
                  <article key={favorite.id} className="group space-y-md">
                    <Link href={`/product/${favorite.products.sku}`}>
                      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                        <Image
                          src={favorite.products.images[0]}
                          alt={favorite.products.name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          loading={isAboveTheFold ? 'eager' : 'lazy'}
                          priority={isAboveTheFold}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </Link>

                    <div className="space-y-xs">
                      <Link href={`/product/${favorite.products.sku}`}>
                        <p className="text-sm tracking-wide hover:underline">{favorite.products.name}</p>
                      </Link>
                      <p className="text-sm font-light">${favorite.products.price.toFixed(2)}</p>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => removeFavorite(favorite.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
