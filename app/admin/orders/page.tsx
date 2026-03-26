'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import { createAdminApiClient, OrderRecord, OrderDraft } from '@/lib/admin';
import { OrderFilters, OrderRow } from '@/components/admin/orders';

const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { session } = useAuth();
  const { itemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const apiRequest = useMemo(() => createAdminApiClient(session?.access_token), [session?.access_token]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = await apiRequest('/api/admin/orders', { method: 'GET' });
      setOrders((payload.data || []) as OrderRecord[]);
    } catch (error: any) {
      setOrders([]);
      setErrorMessage(error?.message || 'Failed to load orders');
    }

    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      void loadOrders();
    }
  }, [isAdmin, loadOrders, session?.access_token]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesQuery = !query || [
        order.order_number,
        order.shipping_addresses?.[0]?.full_name || '',
        order.shipping_addresses?.[0]?.email || '',
        order.payment_id || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [orders, searchQuery, statusFilter]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const draft = orderDrafts[orderId] || {
      status,
      cancellationNote: '',
      trackingNumber: '',
      shippingCarrier: '',
    };

    setUpdatingOrderId(orderId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await apiRequest(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: draft.status,
          cancellationNote: draft.cancellationNote,
          trackingNumber: draft.trackingNumber,
          shippingCarrier: draft.shippingCarrier,
        }),
      });

      const updatedOrder = payload.data as OrderRecord;
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setOrderDrafts((current) => ({
        ...current,
        [updatedOrder.id]: {
          status: updatedOrder.status,
          cancellationNote: updatedOrder.cancellation_note || '',
          trackingNumber: updatedOrder.tracking_number || '',
          shippingCarrier: updatedOrder.shipping_carrier || '',
        },
      }));
      setMessage(`Order ${updatedOrder.order_number} updated`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update order');
    }

    setUpdatingOrderId(null);
  };

  if (checkingAdmin) {
    return (
      <>
        <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-7xl mx-auto px-xl flex items-center justify-center h-64 text-muted-foreground">
            Loading admin orders...
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getDraft = (order: OrderRecord): OrderDraft =>
    orderDrafts[order.id] || {
      status: order.status,
      cancellationNote: order.cancellation_note || '',
      trackingNumber: order.tracking_number || '',
      shippingCarrier: order.shipping_carrier || '',
    };

  const updateDraft = (orderId: string, patch: Partial<OrderDraft>) => {
    const order = orders.find((item) => item.id === orderId);

    setOrderDrafts((current) => {
      const previous = current[orderId] || {
        status: order?.status || 'pending',
        cancellationNote: order?.cancellation_note || '',
        trackingNumber: order?.tracking_number || '',
        shippingCarrier: order?.shipping_carrier || '',
      };

      return {
        ...current,
        [orderId]: {
          ...previous,
          ...patch,
        },
      };
    });
  };

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <OrderFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            allowedStatuses={allowedStatuses}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
          />

          {message && <div className="border-2 border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700">{message}</div>}
          {errorMessage && <div className="border-2 border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

          <section className="border-2 border-foreground/40">
            <div className="border-b-2 border-foreground px-lg py-md">
              <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Orders</h2>
            </div>
            {loading ? (
              <div className="px-lg py-10 text-sm text-muted-foreground">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="px-lg py-10 text-sm text-muted-foreground">No orders found.</div>
            ) : (
              <div className="divide-y divide-foreground/10">
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    draft={getDraft(order)}
                    allowedStatuses={allowedStatuses}
                    updatingOrderId={updatingOrderId}
                    onUpdateDraft={updateDraft}
                    onSave={updateOrderStatus}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
