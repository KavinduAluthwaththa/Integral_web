/**
 * Geolocation and IP-based currency detection
 * Automatically suggest currency based on user's location
 */

import { CurrencyCode, DEFAULT_CURRENCY } from './currencies';

/**
 * Map of country codes to currency codes
 * Based on ISO 3166-1 alpha-2 and ISO 4217 standards
 */
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  // Australia
  'AU': 'AUD',
  // United States, US territories
  'US': 'USD',
  'UM': 'USD',
  'VI': 'USD',
  'PR': 'USD',
  'GU': 'USD',
  'AS': 'USD',
  'MP': 'USD',
  // Euro zone
  'AT': 'EUR', 'BE': 'EUR', 'CY': 'EUR', 'EE': 'EUR', 'FI': 'EUR',
  'FR': 'EUR', 'DE': 'EUR', 'GR': 'EUR', 'IE': 'EUR', 'IT': 'EUR',
  'LV': 'EUR', 'LT': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'NL': 'EUR',
  'PT': 'EUR', 'SK': 'EUR', 'SI': 'EUR', 'ES': 'EUR',
  // United Arab Emirates
  'AE': 'AED',
  // United Kingdom
  'GB': 'GBP',
  'GI': 'GBP',
  'FK': 'GBP',
  'GS': 'GBP',
  // Sri Lanka
  'LK': 'LKR',
  // New Zealand
  'NZ': 'NZD',
  // India
  'IN': 'INR',
};

/**
 * Geo-IP service options (all free):
 * 1. ip-api.com - Free tier: 45 requests/min
 * 2. ipapi.co - Free tier: unlimited but rate limited
 * 3. geolocation-db.com - Free and no rate limits
 * 4. geojs.io - Completely free
 */

/**
 * Get country code from user's IP address
 * Uses geojs.io (completely free, no rate limits)
 */
export async function getCountryFromIP(): Promise<string | null> {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json', {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      console.warn('Failed to get geolocation data');
      return null;
    }

    const data = await response.json();
    return data.country_code || null; // Returns ISO 3166-1 alpha-2 code (e.g., 'US', 'GB', 'IN')
  } catch (error) {
    console.warn('Error fetching geolocation:', error);
    return null;
  }
}

/**
 * Get suggested currency based on user's IP location
 */
export async function getSuggestedCurrencyFromLocation(): Promise<CurrencyCode> {
  try {
    const countryCode = await getCountryFromIP();
    if (!countryCode) {
      return DEFAULT_CURRENCY;
    }

    const currency = COUNTRY_TO_CURRENCY[countryCode];
    return currency || DEFAULT_CURRENCY;
  } catch (error) {
    console.warn('Error getting suggested currency:', error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Get geolocation data (country, timezone, etc.)
 */
export async function getGeolocationData(): Promise<{
  ip: string;
  country: string;
  countryCode: string;
  timezone: string;
  currency?: CurrencyCode;
} | null> {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json', {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const countryCode = data.country_code || '';
    const currency = COUNTRY_TO_CURRENCY[countryCode] || undefined;

    return {
      ip: data.ip,
      country: data.country || '',
      countryCode,
      timezone: data.timezone || '',
      currency,
    };
  } catch (error) {
    console.warn('Error fetching geolocation data:', error);
    return null;
  }
}

/**
 * Alternative geolocation provider (ip-api.com)
 * More reliable but has rate limits (45 requests/min on free tier)
 */
export async function getGeolocationDataFromIPAPI(): Promise<{
  ip: string;
  country: string;
  countryCode: string;
  timezone: string;
  currency?: CurrencyCode;
} | null> {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=query,country,countryCode,timezone', {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const countryCode = data.countryCode || '';
    const currency = COUNTRY_TO_CURRENCY[countryCode] || undefined;

    return {
      ip: data.query,
      country: data.country || '',
      countryCode,
      timezone: data.timezone || '',
      currency,
    };
  } catch (error) {
    console.warn('Error fetching geolocation from ip-api:', error);
    return null;
  }
}

/**
 * Get user's timezone from browser (client-side only)
 */
export function getUserTimezoneCurrency(): CurrencyCode {
  // This would typically be used to get timezone from browser
  // then map to currency - useful for determining business hours, sales, etc.
  // For now, returns default
  return DEFAULT_CURRENCY;
}

/**
 * Check if a currency is suitable for a given country
 */
export function isCurrencyForCountry(countryCode: string, currency: CurrencyCode): boolean {
  return COUNTRY_TO_CURRENCY[countryCode] === currency;
}

/**
 * Get all supported currencies in a specific country region
 * (useful for multi-currency regions like EU)
 */
export function getSupportedCurrenciesForCountry(countryCode: string): CurrencyCode[] {
  const primary = COUNTRY_TO_CURRENCY[countryCode];
  if (!primary) {
    return [DEFAULT_CURRENCY];
  }

  // Return primary currency plus all major supported currencies as fallback
  const supported: CurrencyCode[] = [primary];
  for (const [_, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (!supported.includes(currency)) {
      supported.push(currency);
    }
  }
  return supported;
}
