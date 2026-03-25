import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ReturnAction = 'approve' | 'reject' | 'update_status' | 'create_refund_transaction';

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await getAdminSupabaseClient(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { client, userId } = auth;
  const { id: returnId } = await params;

  const body = await req.json();
  const action = body?.action as ReturnAction | undefined;

  if (!action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  if (action === 'approve') {
    const { error } = await client
      .from('return_requests')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        admin_notes: body?.adminNotes || null,
      })
      .eq('id', returnId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    if (!body?.adminNotes || typeof body.adminNotes !== 'string' || !body.adminNotes.trim()) {
      return NextResponse.json({ error: 'Rejection notes are required' }, { status: 400 });
    }

    const { error } = await client
      .from('return_requests')
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        admin_notes: body.adminNotes,
      })
      .eq('id', returnId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === 'update_status') {
    const newStatus = body?.status as string | undefined;

    if (!newStatus) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      admin_notes: body?.adminNotes || null,
    };

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await client.from('return_requests').update(updates).eq('id', returnId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === 'create_refund_transaction') {
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
    }

    const { data, error } = await client
      .from('refund_transactions')
      .insert({
        return_request_id: returnId,
        transaction_type: body?.transactionType || 'refund',
        amount,
        payment_method: body?.paymentMethod || 'credit_card',
        notes: body?.adminNotes || null,
        status: 'pending',
        processed_by: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
