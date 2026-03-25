import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createClient: createClientMock,
}));

import { getAdminSupabaseClient } from '@/lib/server-admin-auth';

function buildRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/admin/orders', {
    headers: authHeader ? { authorization: authHeader } : undefined,
  });
}

describe('server admin auth security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('rejects missing bearer token', async () => {
    const result = await getAdminSupabaseClient(buildRequest());

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: 'Missing bearer token' });
    }
  });

  it('rejects invalid auth token', async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        }),
      },
    });

    const result = await getAdminSupabaseClient(buildRequest('Bearer bad-token'));

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: 'Invalid auth token' });
    }
  });

  it('rejects non-admin users', async () => {
    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
        },
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { is_admin: false },
                error: null,
              }),
            }),
          }),
        }),
      });

    const result = await getAdminSupabaseClient(buildRequest('Bearer user-token'));

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({ error: 'Admin access required' });
    }
  });

  it('returns authed client for admins', async () => {
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: { is_admin: true },
      error: null,
    });

    const appClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }),
        }),
      }),
    };

    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'admin-1' } },
            error: null,
          }),
        },
      })
      .mockReturnValueOnce(appClient);

    const result = await getAdminSupabaseClient(buildRequest('Bearer valid-token'));

    expect('client' in result).toBe(true);
    if ('client' in result) {
      expect(result.userId).toBe('admin-1');
      expect(result.client).toBe(appClient);
    }

    expect(createClientMock).toHaveBeenNthCalledWith(
      2,
      'https://supabase.test',
      'anon-key',
      expect.objectContaining({
        global: {
          headers: {
            Authorization: 'Bearer valid-token',
          },
        },
      })
    );
  });
});
