import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildRequestSignature,
  buildWebhookSignature,
  formatAmount,
  getPayHereConfig,
  getPayHereEndpoint,
  isPayHereSupportedCurrency,
  normalizePayHereCurrency,
} from '@/lib/payhere';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('payhere helpers', () => {
  it('loads valid config and defaults mode to sandbox', () => {
    process.env.PAYHERE_MERCHANT_ID = 'merchant-1';
    process.env.PAYHERE_MERCHANT_SECRET = 'secret-1';
    process.env.PAYHERE_NOTIFY_URL = 'https://example.test/notify';
    delete process.env.PAYHERE_MODE;

    const config = getPayHereConfig();

    expect(config).toEqual({
      merchantId: 'merchant-1',
      merchantSecret: 'secret-1',
      mode: 'sandbox',
      returnUrl: undefined,
      cancelUrl: undefined,
      notifyUrl: 'https://example.test/notify',
    });
  });

  it('throws when merchant settings are missing', () => {
    delete process.env.PAYHERE_MERCHANT_ID;
    delete process.env.PAYHERE_MERCHANT_SECRET;
    process.env.PAYHERE_NOTIFY_URL = 'https://example.test/notify';

    expect(() => getPayHereConfig()).toThrow('PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET must be set');
  });

  it('throws when notify url is missing', () => {
    process.env.PAYHERE_MERCHANT_ID = 'merchant-1';
    process.env.PAYHERE_MERCHANT_SECRET = 'secret-1';
    delete process.env.PAYHERE_NOTIFY_URL;

    expect(() => getPayHereConfig()).toThrow('PAYHERE_NOTIFY_URL must be set (public webhook endpoint)');
  });

  it('formats amount with exactly two decimals', () => {
    expect(formatAmount(10)).toBe('10.00');
    expect(formatAmount(10.456)).toBe('10.46');
  });

  it('builds stable request signature', () => {
    const merchantId = '123';
    const merchantSecret = 'abc';
    const orderId = 'order-9';
    const amount = 99.5;
    const currency = 'USD';

    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const raw = `${merchantId}${orderId}${formatAmount(amount)}${currency}${secretHash}`;
    const expected = crypto.createHash('md5').update(raw).digest('hex').toUpperCase();

    expect(
      buildRequestSignature({
        merchantId,
        merchantSecret,
        orderId,
        amount,
        currency,
      })
    ).toBe(expected);
  });

  it('builds stable webhook signature', () => {
    const merchantId = '123';
    const merchantSecret = 'abc';
    const orderId = 'order-9';
    const payhereAmount = '99.50';
    const payhereCurrency = 'USD';
    const statusCode = '2';

    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const raw = `${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${secretHash}`;
    const expected = crypto.createHash('md5').update(raw).digest('hex').toUpperCase();

    expect(
      buildWebhookSignature({
        merchantId,
        merchantSecret,
        orderId,
        payhereAmount,
        payhereCurrency,
        statusCode,
      })
    ).toBe(expected);
  });

  it('returns endpoint by mode', () => {
    expect(getPayHereEndpoint('sandbox')).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(getPayHereEndpoint('live')).toBe('https://www.payhere.lk/pay/checkout');
  });

  it('validates supported currency and normalizes unknown values', () => {
    expect(isPayHereSupportedCurrency('USD')).toBe(true);
    expect(isPayHereSupportedCurrency('usd')).toBe(false);

    expect(normalizePayHereCurrency(' lkr ')).toBe('LKR');
    expect(normalizePayHereCurrency('NOT_REAL')).toBe('USD');
    expect(normalizePayHereCurrency()).toBe('USD');
  });
});
