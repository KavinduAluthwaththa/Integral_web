'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/server-user-auth';
import { getServiceSupabaseClient } from '@/lib/supabase-service';

export async function POST(req: NextRequest) {
  const auth = await getUserSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { userId } = auth;
  const serviceClient = getServiceSupabaseClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = String(body?.orderId || '').trim();
  const sessionId = String(body?.sessionId || '').trim();

  if (!orderId || !sessionId) {
    return NextResponse.json({ error: 'orderId and sessionId are required' }, { status: 400 });
  }

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id, user_id, session_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Allow either the authenticated owner or the same session that created the order
  if (order.user_id && order.user_id !== userId) {
    return NextResponse.json({ error: 'Not authorized for this order' }, { status: 403 });
  }

  if (order.session_id && order.session_id !== sessionId) {
    return NextResponse.json({ error: 'Session mismatch for this order' }, { status: 403 });
  }

  const { data, error } = await serviceClient.rpc('process_order_stock', {
    p_order_id: orderId,
    p_session_id: sessionId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Insufficient stock to fulfill order' }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
