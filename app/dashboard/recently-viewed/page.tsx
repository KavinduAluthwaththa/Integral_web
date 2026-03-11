'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { Eye } from 'lucide-react';

interface RecentlyViewed {
  id: string;
  product_id: string;
  viewed_at: string;
  products: {
    id: string;
    name: string;
    sku: string;
    base_price: number;
    images: string[];
  };
}

export default function RecentlyViewedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadRecentlyViewed();
    }
  }, [user, authLoading, router]);

  const loadRecentlyViewed = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recently_viewed')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          base_price,
          images
        )
      `)
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRecentlyViewed(data);
    }

    setLoading(false);
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
          <h1 className="text-2xl font-light tracking-wide">Recently Viewed</h1>
          <p className="text-muted-foreground">
            Products you've recently looked at.
          </p>
        </div>

        {recentlyViewed.length === 0 ? (
          <div className="text-center py-5xl space-y-md">
            <Eye size={48} strokeWidth={1} className="mx-auto text-muted-foreground" />
            <div className="space-y-sm">
              <p className="text-lg">No recently viewed items</p>
              <p className="text-muted-foreground">
                Start browsing to see your history here
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-lg">
            {recentlyViewed.map((item) => (
              <Link key={item.id} href={`/product/${item.products.sku}`}>
                <div className="space-y-md group">
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <Image
                      src={item.products.images[0]}
                      alt={item.products.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="space-y-xs">
                    <p className="text-sm tracking-wide group-hover:underline">
                      {item.products.name}
                    </p>
                    <p className="text-sm font-light">
                      ${item.products.base_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.viewed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
