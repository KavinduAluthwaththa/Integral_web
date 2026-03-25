import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

export async function GET(req: NextRequest) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client } = auth;
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, failuresHourResult, failuresDayResult, totalDayResult] = await Promise.all([
    client
      .from('payhere_webhook_events')
      .select('id, order_id, payment_id, reason, success, status_code, payhere_currency, payhere_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('payhere_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', oneHourAgo),
    client
      .from('payhere_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', oneDayAgo),
    client
      .from('payhere_webhook_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo),
  ]);

  if (eventsResult.error || failuresHourResult.error || failuresDayResult.error || totalDayResult.error) {
    const error = eventsResult.error || failuresHourResult.error || failuresDayResult.error || totalDayResult.error;
    return NextResponse.json({ error: error?.message || 'Failed to load payhere events' }, { status: 500 });
  }

  return NextResponse.json({
    events: eventsResult.data || [],
    stats: {
      failuresLastHour: failuresHourResult.count || 0,
      failuresLastDay: failuresDayResult.count || 0,
      totalLastDay: totalDayResult.count || 0,
    },
  });
}
