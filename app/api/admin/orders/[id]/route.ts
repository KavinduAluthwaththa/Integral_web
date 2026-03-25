import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';
import { buildOrderUpdatePatch } from '@/lib/admin';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  const { client } = auth;
  const body = await req.json();

  const { data: existingOrder, error: existingOrderError } = await client
    .from('orders')
    .select('status, fulfilled_at, shipped_at, delivered_at, cancelled_at')
    .eq('id', id)
    .maybeSingle();

  if (existingOrderError) {
    return NextResponse.json({ error: existingOrderError.message }, { status: 500 });
  }

  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  let updatePatch: Record<string, unknown>;
  try {
    updatePatch = buildOrderUpdatePatch(existingOrder, {
      status: String(body?.status || '').trim(),
      cancellationNote: typeof body?.cancellationNote === 'string' ? body.cancellationNote : undefined,
      trackingNumber: typeof body?.trackingNumber === 'string' ? body.trackingNumber : undefined,
      shippingCarrier: typeof body?.shippingCarrier === 'string' ? body.shippingCarrier : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Invalid order update request' }, { status: 400 });
  }

  const { data, error } = await client
    .from('orders')
    .update(updatePatch)
    .eq('id', id)
    .select(`
      *,
      order_items (
        id,
        quantity,
        price,
        products (id, name, sku),
        product_variants (id, size)
      ),
      shipping_addresses (*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
