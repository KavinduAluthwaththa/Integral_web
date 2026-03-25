import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

export async function GET(req: NextRequest) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client } = auth;
  const { data, error } = await client
    .from('orders')
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
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
