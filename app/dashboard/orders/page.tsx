'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { Package } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  payment_id?: string | null;
  order_items: {
    quantity: number;
    price: number;
    products: {
      name: string;
    };
  }[];
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        payment_id,
        order_items (
          quantity,
          price,
          products (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      void loadOrders();
    }
  }, [user, authLoading, router, loadOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600';
      case 'shipped':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
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
          <h1 className="text-2xl font-light tracking-wide">Order History</h1>
          <p className="text-muted-foreground">
            View and track your orders.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-5xl space-y-md">
            <Package size={48} strokeWidth={1} className="mx-auto text-muted-foreground" />
            <div className="space-y-sm">
              <p className="text-lg">No orders yet</p>
              <p className="text-muted-foreground">
                Start shopping to see your orders here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-lg">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-foreground/10 p-lg space-y-md"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-xs">
                    <p className="font-medium tracking-wide">
                      Order {order.order_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right space-y-xs">
                    <p className="text-sm font-medium">${order.total.toFixed(2)}</p>
                    <p className={`text-sm capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </p>
                    {order.payment_id && (
                      <p className="text-[11px] text-muted-foreground">Txn: {order.payment_id}</p>
                    )}
                  </div>
                </div>

                <div className="pt-md border-t border-foreground/10 space-y-sm">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.products.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} × ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
