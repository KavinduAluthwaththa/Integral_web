'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase-service';

interface SessionAnalyticsPayload {
  sessionId?: unknown;
  userId?: unknown;
  visitorId?: unknown;
  isReturning?: unknown;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  let payload: SessionAnalyticsPayload;

  try {
    payload = (await req.json()) as SessionAnalyticsPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = asOptionalString(payload.sessionId);
  const userId = asOptionalString(payload.userId);
  const visitorId = asOptionalString(payload.visitorId);
  const isReturning = payload.isReturning === true;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const serviceClient = getServiceSupabaseClient();

  const { data: existing, error: selectError } = await serviceClient
    .from('session_analytics')
    .select('id, page_views')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existing) {
    const updatePayload: {
      last_activity: string;
      page_views: number;
      visitor_id?: string;
      user_id?: string;
    } = {
      last_activity: new Date().toISOString(),
      page_views: (existing.page_views || 0) + 1,
    };

    if (visitorId) updatePayload.visitor_id = visitorId;
    if (userId) updatePayload.user_id = userId;

    const { error: updateError } = await serviceClient
      .from('session_analytics')
      .update(updatePayload)
      .eq('session_id', sessionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await serviceClient.from('session_analytics').insert({
      session_id: sessionId,
      user_id: userId,
      visitor_id: visitorId,
      is_returning: isReturning,
      page_views: 1,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}