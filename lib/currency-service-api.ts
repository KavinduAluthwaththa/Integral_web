/**
 * Currency service with real-time API rates and geolocation support
 * No database required - uses free external APIs
 */

import { CurrencyCode, DEFAULT_CURRENCY } from './currencies';

// ===== EXCHANGE RATE API OPTIONS =====
// Free APIs (no authentication required or easy setup):
// 1. ExchangeRate-API: https://www.exchangerate-api.com (1500 req/month free)
// 2. Open Exchange Rates: https://openexchangerates.org (1000 req/month free)
// 3. fixer.io: https://fixer.io (100 req/month free)
// 4. Xe Currency Data: https://xecdapi.xe.com (no free tier but reliable)
// 5. CurrencyAPI: https://currencyapi.com (300 req/month free)
// 6. latest.currency-api.pages.dev: Community project (truly free, no limits)

const EXCHANGE_RATE_API = 'https://latest.currency-api.pages.dev/v1/currencies';

// Cache for exchange rates
let exchangeRatesCache: Map<string, { rate: number; timestamp: number }> = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

/**
 * Get real-time exchange rate from free API (no database needed)
 */
export async function getExchangeRate(
  fromCurrency: CurrencyCode | string,
  toCurrency: CurrencyCode | string
): Promise<number> {
  // Same currency = 1.0
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = exchangeRatesCache.get(cacheKey);

  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    const from = fromCurrency.toLowerCase();
    const to = toCurrency.toLowerCase();

    // Fetch all rates from source currency in one request
    const response = await fetch(`${EXCHANGE_RATE_API}/${from}.json`, {
      next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      console.warn(`Failed to fetch exchange rates: ${response.statusText}`);
      return 1.0;
    }

    const data = await response.json();
    const rates = data[from];

    if (!rates || !rates[to]) {
      console.warn(`No exchange rate found for ${from} to ${to}`);
      return 1.0;
    }

    const rate = rates[to];

    // Cache the rate
    exchangeRatesCache.set(cacheKey, { rate, timestamp: Date.now() });
    return rate;
  } catch (error) {
    console.warn('Error fetching exchange rate:', error);
    return 1.0;
  }
}

/**
 * Get all exchange rates for a specific currency
 */
export async function getExchangeRatesFor(
  fromCurrency: CurrencyCode | string
): Promise<Record<string, number>> {
  try {
    const from = fromCurrency.toLowerCase();
    const response = await fetch(`${EXCHANGE_RATE_API}/${from}.json`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return data[from] || {};
  } catch (error) {
    console.warn('Error fetching exchange rates:', error);
    return {};
  }
}

/**
 * Convert price from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode | string,
  toCurrency: CurrencyCode | string
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Format a price with currency symbol and localization
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode | string = DEFAULT_CURRENCY
): string {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency as string,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Format a price with conversion
 */
export async function formatAndConvertPrice(
  amount: number,
  fromCurrency: CurrencyCode | string,
  toCurrency: CurrencyCode | string = DEFAULT_CURRENCY
): Promise<string> {
  const convertedAmount = await convertCurrency(amount, fromCurrency, toCurrency);
  return formatPrice(convertedAmount, toCurrency);
}

/**
 * Clear the exchange rates cache
 */
export function clearExchangeRatesCache(): void {
  exchangeRatesCache.clear();
}

/**
 * Refresh a specific exchange rate from cache
 */
export async function refreshExchangeRate(
  fromCurrency: CurrencyCode | string,
  toCurrency: CurrencyCode | string
): Promise<number> {
  const cacheKey = `${fromCurrency}_${toCurrency}`;
  exchangeRatesCache.delete(cacheKey);
  return getExchangeRate(fromCurrency, toCurrency);
}
