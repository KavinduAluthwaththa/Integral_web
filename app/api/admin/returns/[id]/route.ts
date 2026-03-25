import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client } = auth;
  const { id: returnId } = await params;

  const [{ data: returnRequest, error: returnError }, { data: items, error: itemsError }, { data: transactions, error: txError }] = await Promise.all([
    client.from('return_requests').select('*').eq('id', returnId).maybeSingle(),
    client.from('return_items').select('*').eq('return_request_id', returnId).order('created_at', { ascending: true }),
    client.from('refund_transactions').select('*').eq('return_request_id', returnId).order('created_at', { ascending: false }),
  ]);

  if (returnError || itemsError || txError) {
    return NextResponse.json(
      { error: returnError?.message || itemsError?.message || txError?.message || 'Failed to load return details' },
      { status: 500 }
    );
  }

  if (!returnRequest) {
    return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      returnRequest,
      items: items ?? [],
      transactions: transactions ?? [],
    },
  });
}
