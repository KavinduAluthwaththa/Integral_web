import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getAdminSupabaseClientMock } = vi.hoisted(() => ({
  getAdminSupabaseClientMock: vi.fn(),
}));

vi.mock('@/lib/server-admin-auth', () => ({
  getAdminSupabaseClient: getAdminSupabaseClientMock,
}));

import { GET } from '@/app/api/admin/orders/route';

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/orders', {
    method: 'GET',
    headers: { authorization: 'Bearer token' },
  });
}

describe('admin orders api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth response when auth fails', async () => {
    getAdminSupabaseClientMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it('returns list of orders', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [{ id: 'o1', status: 'pending' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: fromMock },
      userId: 'admin-1',
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'o1', status: 'pending' }] });
  });

  it('returns 500 when query fails', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'db failure' },
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: vi.fn().mockReturnValue({ select: selectMock }) },
      userId: 'admin-1',
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'db failure' });
  });
});
