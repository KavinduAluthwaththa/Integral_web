import { NextRequest, NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/server-user-auth';
import { getServiceSupabaseClient } from '@/lib/supabase-service';
import { convertCurrency } from '@/lib/currency-service-api';
import { buildRequestSignature, getPayHereConfig, getPayHereEndpoint, normalizePayHereCurrency } from '@/lib/payhere';

interface InitiateBody {
  orderId?: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const auth = await getUserSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { userId, client } = auth;
  const body = (await req.json()) as InitiateBody;

  if (!body.orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id, order_number, total, payment_status, payment_method')
    .eq('id', body.orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
  }

  const currency = normalizePayHereCurrency(body.currency);

  const { merchantId, merchantSecret, mode, returnUrl, cancelUrl, notifyUrl } = getPayHereConfig();

  const baseCurrency = 'USD';
  const baseAmount = Number(order.total || 0);

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
  }

  const amount = currency === baseCurrency
    ? baseAmount
    : await convertCurrency(baseAmount, baseCurrency, currency);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Failed to calculate payment amount' }, { status: 500 });
  }

  const signature = buildRequestSignature({
    merchantId,
    merchantSecret,
    orderId: order.order_number,
    amount,
    currency,
  });

  const endpoint = getPayHereEndpoint(mode);

  try {
    const serviceClient = getServiceSupabaseClient();
    await serviceClient
      .from('orders')
      .update({ payment_method: 'payhere', payment_status: 'pending' })
      .eq('id', order.id)
      .eq('user_id', userId);
  } catch (error: any) {
    console.error('Failed to update order payment_method/payment_status', error);
  }

  const payload = {
    merchant_id: merchantId,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/checkout/success?order=${order.id}`,
    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/checkout/cancel?order=${order.id}`,
    notify_url: notifyUrl,
    order_id: order.order_number,
    items: order.order_number,
    currency,
    amount: amount.toFixed(2),
    hash: signature,
  };

  return NextResponse.json({ endpoint, payload });
}