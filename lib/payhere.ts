import crypto from 'crypto';
import { CURRENCY_CODES, CurrencyCode } from '@/lib/currencies';

export type PayHereMode = 'sandbox' | 'live';

const PAYHERE_SUPPORTED_CURRENCIES = new Set<CurrencyCode>(CURRENCY_CODES);

export function getPayHereConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  const mode = (process.env.PAYHERE_MODE || 'sandbox') as PayHereMode;
  const returnUrl = process.env.PAYHERE_RETURN_URL;
  const cancelUrl = process.env.PAYHERE_CANCEL_URL;
  const notifyUrl = process.env.PAYHERE_NOTIFY_URL;

  if (!merchantId || !merchantSecret) {
    throw new Error('PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET must be set');
  }

  if (!notifyUrl) {
    throw new Error('PAYHERE_NOTIFY_URL must be set (public webhook endpoint)');
  }

  return { merchantId, merchantSecret, mode, returnUrl, cancelUrl, notifyUrl };
}

export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function buildRequestSignature(params: {
  merchantId: string;
  merchantSecret: string;
  orderId: string;
  amount: number;
  currency: string;
}): string {
  const secretHash = crypto.createHash('md5').update(params.merchantSecret).digest('hex').toUpperCase();
  const raw = `${params.merchantId}${params.orderId}${formatAmount(params.amount)}${params.currency}${secretHash}`;
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

export function buildWebhookSignature(params: {
  merchantId: string;
  merchantSecret: string;
  orderId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: string;
}): string {
  const secretHash = crypto.createHash('md5').update(params.merchantSecret).digest('hex').toUpperCase();
  const raw = `${params.merchantId}${params.orderId}${params.payhereAmount}${params.payhereCurrency}${params.statusCode}${secretHash}`;
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
}

export function getPayHereEndpoint(mode: PayHereMode): string {
  return mode === 'live'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';
}

export function isPayHereSupportedCurrency(value: string): value is CurrencyCode {
  return PAYHERE_SUPPORTED_CURRENCIES.has(value as CurrencyCode);
}

export function normalizePayHereCurrency(input?: string | null): CurrencyCode {
  const candidate = String(input || '').trim().toUpperCase();
  if (isPayHereSupportedCurrency(candidate)) {
    return candidate;
  }

  return 'USD';
}