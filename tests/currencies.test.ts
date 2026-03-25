import { describe, expect, it } from 'vitest';
import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  getAllCurrencies,
  getCurrencyInfo,
  SUPPORTED_CURRENCIES,
} from '@/lib/currencies';

describe('currencies', () => {
  it('returns currency info for supported code', () => {
    const usd = getCurrencyInfo('USD');

    expect(usd).toEqual(SUPPORTED_CURRENCIES.USD);
  });

  it('falls back to default currency for unsupported code', () => {
    const unknown = getCurrencyInfo('XYZ');

    expect(unknown).toEqual(SUPPORTED_CURRENCIES[DEFAULT_CURRENCY]);
  });

  it('returns all configured currencies', () => {
    const all = getAllCurrencies();

    expect(all).toHaveLength(CURRENCY_CODES.length);
    expect(all).toContainEqual(SUPPORTED_CURRENCIES.USD);
    expect(all).toContainEqual(SUPPORTED_CURRENCIES.GBP);
  });

  it('keeps currency code list in sync with supported map keys', () => {
    const mapKeys = Object.keys(SUPPORTED_CURRENCIES).sort();

    expect([...CURRENCY_CODES].sort()).toEqual(mapKeys);
  });
});
