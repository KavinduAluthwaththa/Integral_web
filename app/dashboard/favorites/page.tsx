'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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

    loadFavorites();
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-5xl">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-xl">
        <div className="space-y-sm">
          <h1 className="text-2xl font-light tracking-wide">Favorites</h1>
          <p className="text-muted-foreground">
            Items you&apos;ve saved for later.
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-5xl space-y-md">
            <Heart size={48} strokeWidth={1} className="mx-auto text-muted-foreground" />
            <div className="space-y-sm">
              <p className="text-lg">No favorites yet</p>
              <p className="text-muted-foreground">
                Start adding items to your favorites
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-lg">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="space-y-md group">
                <Link href={`/product/${favorite.products.sku}`}>
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <Image
                      src={favorite.products.images[0]}
                      alt={favorite.products.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </Link>

                <div className="space-y-xs">
                  <Link href={`/product/${favorite.products.sku}`}>
                    <p className="text-sm tracking-wide hover:underline">
                      {favorite.products.name}
                    </p>
                  </Link>
                  <p className="text-sm font-light">
                    ${favorite.products.price.toFixed(2)}
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => removeFavorite(favorite.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
