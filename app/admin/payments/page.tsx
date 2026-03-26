'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import { createAdminApiClient } from '@/lib/admin/api-client';
import { ShieldAlert, Clock } from 'lucide-react';

interface PayHereEvent {
  id: string;
  order_id: string | null;
  payment_id: string | null;
  reason: string | null;
  success: boolean;
  status_code: string | null;
  payhere_currency: string | null;
  payhere_amount: string | null;
  created_at: string;
}

interface PayHereStats {
  failuresLastHour: number;
  failuresLastDay: number;
  totalLastDay: number;
}

export default function AdminPaymentsPage() {
  const { session } = useAuth();
  const { itemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();
  const apiRequest = useMemo(() => createAdminApiClient(session?.access_token), [session?.access_token]);

  const [loading, setLoading] = useState(true);
  const [payhereEvents, setPayhereEvents] = useState<PayHereEvent[]>([]);
  const [payhereStats, setPayhereStats] = useState<PayHereStats>({ failuresLastHour: 0, failuresLastDay: 0, totalLastDay: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const eventsPayload = await apiRequest('/api/admin/payments/payhere-events', { method: 'GET' });
      setPayhereEvents((eventsPayload?.events || []) as PayHereEvent[]);
      setPayhereStats((eventsPayload?.stats || { failuresLastHour: 0, failuresLastDay: 0, totalLastDay: 0 }) as PayHereStats);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load webhook events');
      setPayhereEvents([]);
      setPayhereStats({ failuresLastHour: 0, failuresLastDay: 0, totalLastDay: 0 });
    }
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    if (isAdmin && session?.access_token) {
      void loadData();
    }
  }, [isAdmin, loadData, session?.access_token]);

  if (checkingAdmin) {
    return (
      <>
        <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-7xl mx-auto px-xl flex items-center justify-center h-64 text-muted-foreground">
            Loading payments...
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const failureRate = payhereStats.totalLastDay > 0
    ? (payhereStats.failuresLastDay / payhereStats.totalLastDay) * 100
    : 0;

  const payhereSeverity = payhereStats.failuresLastHour >= 3
    ? 'high'
    : failureRate >= 10
      ? 'high'
      : failureRate >= 5
        ? 'medium'
        : 'low';

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-light tracking-wide">Payment Webhooks Health</h1>
              <p className="text-muted-foreground mt-2">Monitor PayHere webhook failures and recent events.</p>
            </div>
            <button
              onClick={() => void loadData()}
              className="h-10 w-full px-4 text-xs uppercase tracking-[0.2em] border-2 border-foreground/40 bg-background transition-colors duration-300 hover:bg-foreground hover:text-background sm:w-auto"
            >
              Refresh
            </button>
          </div>

          <section className={`border-2 p-lg space-y-3 ${payhereSeverity === 'high' ? 'border-red-600' : payhereSeverity === 'medium' ? 'border-amber-500' : 'border-foreground'}`}>
            <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-5 w-5 ${payhereSeverity === 'high' ? 'text-red-600' : payhereSeverity === 'medium' ? 'text-amber-500' : ''}`} />
                <h2 className="text-lg font-light tracking-wide">Status</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Last hour: {payhereStats.failuresLastHour} failures</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  <span>24h failures: {payhereStats.failuresLastDay}</span>
                </div>
                <div>
                  24h failure rate: {failureRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="border-2 border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
            )}

            <div className="border-2 border-foreground/20 p-md bg-secondary/40 text-sm space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Summary</p>
              <p className="text-muted-foreground">Alerts fire at 3+ failures in an hour or {'>'}10% failure rate in 24h (server-side; Slack/Teams if configured).</p>
            </div>
          </section>

          <section className="border-2 border-foreground/40 p-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-light tracking-wide">Latest Events (detailed)</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Most recent 20 entries</span>
            </div>
            <div className="overflow-auto">
              <div className="min-w-[840px] border-2 border-foreground/20">
                <div className="grid grid-cols-7 bg-secondary/50 text-[11px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">
                  <span>Time</span>
                  <span>Order</span>
                  <span>Payment</span>
                  <span>Code</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Reason</span>
                </div>
                <div className="divide-y divide-foreground/10">
                  {loading ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">Loading events...</div>
                  ) : payhereEvents.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">No events logged yet.</div>
                  ) : (
                    payhereEvents.map((evt) => (
                      <div key={evt.id} className="grid grid-cols-7 items-start px-3 py-3 text-sm text-muted-foreground">
                        <span>{new Date(evt.created_at).toLocaleString()}</span>
                        <span className="truncate" title={evt.order_id || ''}>{evt.order_id || '—'}</span>
                        <span className="truncate" title={evt.payment_id || ''}>{evt.payment_id || '—'}</span>
                        <span>{evt.status_code || 'n/a'}</span>
                        <span>{evt.payhere_amount || 'n/a'} {evt.payhere_currency || ''}</span>
                        <span className={`text-[10px] uppercase tracking-[0.2em] inline-flex w-fit px-2 py-1 border-2 ${evt.success ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700'}`}>
                          {evt.success ? 'Success' : 'Fail'}
                        </span>
                        <span className="text-foreground/80">{evt.reason || '—'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}