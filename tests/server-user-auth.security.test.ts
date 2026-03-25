import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createClient: createClientMock,
}));

import { getUserSupabaseClient } from '@/lib/server-user-auth';

function buildRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/payments/payhere/initiate', {
    headers: authHeader ? { authorization: authHeader } : undefined,
  });
}

describe('server user auth security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('rejects missing bearer token', async () => {
    const result = await getUserSupabaseClient(buildRequest());

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

    const result = await getUserSupabaseClient(buildRequest('Bearer bad-token'));

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: 'Invalid auth token' });
    }
  });

  it('returns scoped client for valid user token', async () => {
    const appClient = { from: vi.fn() };

    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
        },
      })
      .mockReturnValueOnce(appClient);

    const result = await getUserSupabaseClient(buildRequest('Bearer valid-token'));

    expect('client' in result).toBe(true);
    if ('client' in result) {
      expect(result.userId).toBe('user-1');
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
