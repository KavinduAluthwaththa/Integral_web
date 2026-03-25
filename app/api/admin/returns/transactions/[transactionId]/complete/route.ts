import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

interface RouteParams {
  params: { transactionId: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client } = auth;

  const { error } = await client
    .from('refund_transactions')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', params.transactionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
