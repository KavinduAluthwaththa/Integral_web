/**
 * Currency definitions and configurations
 */

export const SUPPORTED_CURRENCIES = {
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: '$', locale: 'en-AU' },
  USD: { code: 'USD', name: 'United States Dollar', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  AED: { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ', locale: 'ar-AE' },
  GBP: { code: 'GBP', name: 'British Pound Sterling', symbol: '£', locale: 'en-GB' },
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', locale: 'si-LK' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', locale: 'en-NZ' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const CURRENCY_CODES = Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function getCurrencyInfo(code: CurrencyCode | string) {
  const currency = SUPPORTED_CURRENCIES[code as CurrencyCode];
  return currency || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
}

export function getAllCurrencies() {
  return Object.values(SUPPORTED_CURRENCIES);
}
