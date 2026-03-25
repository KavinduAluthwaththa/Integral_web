'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed' | 'unknown'>('unknown');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    let tries = 0;
    let cancelled = false;

    const poll = async () => {
      if (!orderId) return;
      tries += 1;
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status, order_number')
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setStatus('unknown');
        return;
      }

      if (data) {
        setStatus((data.payment_status as any) || 'pending');
        setOrderNumber(data.order_number || null);
        if (data.payment_status === 'paid' || data.payment_status === 'failed') {
          return;
        }
      }

      if (tries < 10) {
        setTimeout(poll, 1500);
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <>
      <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-2xl mx-auto px-xl text-center space-y-6">
          <h1 className="text-3xl font-light tracking-wide">Payment Submitted</h1>
          <p className="text-muted-foreground text-sm">
            We received your payment details. If PayHere confirms the transaction, your order will move to processing automatically.
          </p>
          {orderId && (
            <p className="text-sm">Order ID: <span className="font-medium">{orderId}</span></p>
          )}
          {orderNumber && (
            <p className="text-xs text-muted-foreground">Order Number: {orderNumber}</p>
          )}
          <p className="text-sm">
            Payment Status: <span className="font-medium">{status === 'unknown' ? 'Checking...' : status}</span>
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard/orders">
              <Button>View Orders</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}