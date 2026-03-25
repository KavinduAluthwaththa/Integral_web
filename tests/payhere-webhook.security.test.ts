import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getServiceSupabaseClientMock,
  convertCurrencyMock,
  buildWebhookSignatureMock,
  getPayHereConfigMock,
  isPayHereSupportedCurrencyMock,
} = vi.hoisted(() => ({
  getServiceSupabaseClientMock: vi.fn(),
  convertCurrencyMock: vi.fn(),
  buildWebhookSignatureMock: vi.fn(),
  getPayHereConfigMock: vi.fn(),
  isPayHereSupportedCurrencyMock: vi.fn(),
}));

vi.mock('@/lib/supabase-service', () => ({
  getServiceSupabaseClient: getServiceSupabaseClientMock,
}));

vi.mock('@/lib/currency-service-api', () => ({
  convertCurrency: convertCurrencyMock,
}));

vi.mock('@/lib/payhere', () => ({
  buildWebhookSignature: buildWebhookSignatureMock,
  getPayHereConfig: getPayHereConfigMock,
  isPayHereSupportedCurrency: isPayHereSupportedCurrencyMock,
}));

import { POST } from '@/app/api/payments/payhere/webhook/route';

function makeWebhookRequest(fields: Record<string, string>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }

  return new NextRequest('http://localhost/api/payments/payhere/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
}

function makeServiceClient(order: { data: any; error: any }) {
  const ordersMaybeSingle = vi.fn().mockResolvedValue(order);
  const ordersEq = vi.fn().mockReturnValue({ maybeSingle: ordersMaybeSingle });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'orders') {
      return {
        select: vi.fn().mockReturnValue({ eq: ordersEq }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    }

    if (table === 'payhere_webhook_events') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0 }),
          }),
          gte: vi.fn().mockResolvedValue({ count: 1 }),
        }),
      };
    }

    if (table === 'payhere_alert_state') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from };
}

describe('payhere webhook security checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getPayHereConfigMock.mockReturnValue({
      merchantId: 'merchant-1',
      merchantSecret: 'secret-1',
    });
    isPayHereSupportedCurrencyMock.mockReturnValue(true);
    buildWebhookSignatureMock.mockReturnValue('VALID_SIG');
    convertCurrencyMock.mockResolvedValue(100);
    getServiceSupabaseClientMock.mockReturnValue(
      makeServiceClient({
        data: {
          id: 'order-db-1',
          total: 100,
          payment_status: 'pending',
          payment_id: null,
        },
        error: null,
      })
    );
  });

  it('rejects webhook payloads with missing required fields', async () => {
    const response = await POST(makeWebhookRequest({ order_id: 'ORD-1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid payload' });
  });

  it('rejects merchant id mismatches', async () => {
    const response = await POST(
      makeWebhookRequest({
        order_id: 'ORD-1',
        merchant_id: 'wrong-merchant',
        payhere_amount: '100.00',
        payhere_currency: 'USD',
        status_code: '2',
        md5sig: 'VALID_SIG',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Merchant mismatch' });
  });

  it('rejects signature mismatches', async () => {
    const response = await POST(
      makeWebhookRequest({
        order_id: 'ORD-1',
        merchant_id: 'merchant-1',
        payhere_amount: '100.00',
        payhere_currency: 'USD',
        status_code: '2',
        md5sig: 'WRONG_SIG',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Signature mismatch' });
  });

  it('rejects unsupported currencies', async () => {
    isPayHereSupportedCurrencyMock.mockReturnValueOnce(false);

    const response = await POST(
      makeWebhookRequest({
        order_id: 'ORD-1',
        merchant_id: 'merchant-1',
        payhere_amount: '100.00',
        payhere_currency: 'XXX',
        status_code: '2',
        md5sig: 'VALID_SIG',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Unsupported currency' });
  });

  it('rejects amount mismatches to prevent tampered payments', async () => {
    const response = await POST(
      makeWebhookRequest({
        order_id: 'ORD-1',
        merchant_id: 'merchant-1',
        payhere_amount: '10.00',
        payhere_currency: 'USD',
        status_code: '2',
        md5sig: 'VALID_SIG',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Amount mismatch' });
  });

  it('keeps webhook handling idempotent for duplicate paid callbacks', async () => {
    getServiceSupabaseClientMock.mockReturnValueOnce(
      makeServiceClient({
        data: {
          id: 'order-db-1',
          total: 100,
          payment_status: 'paid',
          payment_id: 'pay-1',
        },
        error: null,
      })
    );

    const response = await POST(
      makeWebhookRequest({
        order_id: 'ORD-1',
        merchant_id: 'merchant-1',
        payhere_amount: '100.00',
        payhere_currency: 'USD',
        status_code: '2',
        payment_id: 'pay-1',
        md5sig: 'VALID_SIG',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      note: 'Already processed payment_id',
    });
  });
});
