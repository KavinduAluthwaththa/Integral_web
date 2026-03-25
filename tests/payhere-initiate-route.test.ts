import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const {
  getUserSupabaseClientMock,
  getServiceSupabaseClientMock,
  convertCurrencyMock,
  getPayHereConfigMock,
  getPayHereEndpointMock,
  normalizePayHereCurrencyMock,
  buildRequestSignatureMock,
} = vi.hoisted(() => ({
  getUserSupabaseClientMock: vi.fn(),
  getServiceSupabaseClientMock: vi.fn(),
  convertCurrencyMock: vi.fn(),
  getPayHereConfigMock: vi.fn(),
  getPayHereEndpointMock: vi.fn(),
  normalizePayHereCurrencyMock: vi.fn(),
  buildRequestSignatureMock: vi.fn(),
}));

vi.mock('@/lib/server-user-auth', () => ({
  getUserSupabaseClient: getUserSupabaseClientMock,
}));

vi.mock('@/lib/supabase-service', () => ({
  getServiceSupabaseClient: getServiceSupabaseClientMock,
}));

vi.mock('@/lib/currency-service-api', () => ({
  convertCurrency: convertCurrencyMock,
}));

vi.mock('@/lib/payhere', () => ({
  getPayHereConfig: getPayHereConfigMock,
  getPayHereEndpoint: getPayHereEndpointMock,
  normalizePayHereCurrency: normalizePayHereCurrencyMock,
  buildRequestSignature: buildRequestSignatureMock,
}));

import { POST } from '@/app/api/payments/payhere/initiate/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/payments/payhere/initiate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer token-1',
    },
    body: JSON.stringify(body),
  });
}

function makeOrdersClient(orderResult: { data: any; error: any }) {
  const maybeSingleMock = vi.fn().mockResolvedValue(orderResult);
  const eqSecondMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const eqFirstMock = vi.fn().mockReturnValue({ eq: eqSecondMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqFirstMock });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table !== 'orders') {
      throw new Error(`Unexpected table ${table}`);
    }

    return {
      select: selectMock,
    };
  });

  return { from: fromMock };
}

describe('payhere initiate api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPayHereConfigMock.mockReturnValue({
      merchantId: 'merchant-1',
      merchantSecret: 'secret-1',
      mode: 'sandbox',
      returnUrl: 'https://example.test/return',
      cancelUrl: 'https://example.test/cancel',
      notifyUrl: 'https://example.test/notify',
    });
    getPayHereEndpointMock.mockReturnValue('https://sandbox.payhere.lk/pay/checkout');
    normalizePayHereCurrencyMock.mockReturnValue('USD');
    buildRequestSignatureMock.mockReturnValue('HASH123');

    const serviceUpdateEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const serviceUpdateEqIdMock = vi.fn().mockReturnValue({ eq: serviceUpdateEqUserMock });
    const serviceUpdateMock = vi.fn().mockReturnValue({ eq: serviceUpdateEqIdMock });
    const serviceFromMock = vi.fn().mockReturnValue({ update: serviceUpdateMock });

    getServiceSupabaseClientMock.mockReturnValue({
      from: serviceFromMock,
    });
  });

  it('returns auth response when user auth fails', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    });

    const response = await POST(makeRequest({ orderId: 'o1' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('returns 400 when orderId is missing', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({ data: null, error: null }),
    });

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'orderId is required' });
  });

  it('returns 404 when order does not exist', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({ data: null, error: null }),
    });

    const response = await POST(makeRequest({ orderId: 'o-missing' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Order not found' });
  });

  it('returns 400 when order is already paid', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({
        data: {
          id: 'o1',
          order_number: 'ORD-1',
          total: 120,
          payment_status: 'paid',
          payment_method: 'payhere',
        },
        error: null,
      }),
    });

    const response = await POST(makeRequest({ orderId: 'o1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Order already paid' });
  });

  it('returns 400 when order total is invalid', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({
        data: {
          id: 'o1',
          order_number: 'ORD-1',
          total: 0,
          payment_status: 'pending',
          payment_method: null,
        },
        error: null,
      }),
    });

    const response = await POST(makeRequest({ orderId: 'o1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid order total' });
  });

  it('returns 500 when currency conversion returns invalid amount', async () => {
    normalizePayHereCurrencyMock.mockReturnValueOnce('EUR');
    convertCurrencyMock.mockResolvedValueOnce(NaN);

    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({
        data: {
          id: 'o1',
          order_number: 'ORD-1',
          total: 120,
          payment_status: 'pending',
          payment_method: null,
        },
        error: null,
      }),
    });

    const response = await POST(makeRequest({ orderId: 'o1', currency: 'EUR' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to calculate payment amount' });
  });

  it('returns endpoint and payload when initiation succeeds', async () => {
    getUserSupabaseClientMock.mockResolvedValueOnce({
      userId: 'user-1',
      client: makeOrdersClient({
        data: {
          id: 'o1',
          order_number: 'ORD-1',
          total: 120,
          payment_status: 'pending',
          payment_method: null,
        },
        error: null,
      }),
    });

    const response = await POST(makeRequest({ orderId: 'o1', currency: 'USD' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      endpoint: 'https://sandbox.payhere.lk/pay/checkout',
      payload: {
        merchant_id: 'merchant-1',
        return_url: 'https://example.test/return',
        cancel_url: 'https://example.test/cancel',
        notify_url: 'https://example.test/notify',
        order_id: 'ORD-1',
        items: 'ORD-1',
        currency: 'USD',
        amount: '120.00',
        hash: 'HASH123',
      },
    });

    expect(buildRequestSignatureMock).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      merchantSecret: 'secret-1',
      orderId: 'ORD-1',
      amount: 120,
      currency: 'USD',
    });
  });
});
