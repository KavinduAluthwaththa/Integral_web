import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

export async function getAdminSupabaseClient(req: NextRequest): Promise<
  | { client: any; userId: string }
  | { response: NextResponse }
> {
  const token = extractBearerToken(req);

  if (!token) {
    return {
      response: NextResponse.json({ error: 'Missing bearer token' }, { status: 401 }),
    };
  }

  const { url, anonKey } = getSupabaseEnv();

  const authClient = createClient<any>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return {
      response: NextResponse.json({ error: 'Invalid auth token' }, { status: 401 }),
    };
  }

  const client = createClient<any>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    return {
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return { client, userId: user.id };
}
