import { NextRequest, NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/server-user-auth';
import { convertCurrency } from '@/lib/currency-service-api';
import { buildRequestSignature, getPayHereConfig, getPayHereEndpoint, normalizePayHereCurrency } from '@/lib/payhere';

interface InitiateBody {
  orderId?: string;
  currency?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
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
    .select('id, order_number, total, status')
    .eq('id', body.orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'paid' || order.status === 'completed') {
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
    first_name: body.customer?.firstName || 'Customer',
    last_name: body.customer?.lastName || '',
    email: body.customer?.email || 'noreply@example.com',
    phone: body.customer?.phone || '0000000000',
    address: body.customer?.address || 'N/A',
    city: body.customer?.city || 'N/A',
    country: body.customer?.country || 'N/A',
  };

  return NextResponse.json({ endpoint, payload });
}