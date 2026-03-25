import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCountryFromIP,
  getGeolocationData,
  getGeolocationDataFromIPAPI,
  getSuggestedCurrencyFromLocation,
  getSupportedCurrenciesForCountry,
  getUserTimezoneCurrency,
  isCurrencyForCountry,
} from '@/lib/geolocation-currency';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('geolocation currency helpers', () => {
  it('returns country code from geojs when request succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'GB' }),
    } as Response);

    const country = await getCountryFromIP();

    expect(country).toBe('GB');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://get.geojs.io/v1/ip/geo.json',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );
  });

  it('returns null when geojs request fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

    await expect(getCountryFromIP()).resolves.toBeNull();
  });

  it('returns null when geojs request throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));

    await expect(getCountryFromIP()).resolves.toBeNull();
  });

  it('maps country to suggested currency', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'IN' }),
    } as Response);

    await expect(getSuggestedCurrencyFromLocation()).resolves.toBe('INR');
  });

  it('falls back to default currency when country is unknown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'ZZ' }),
    } as Response);

    await expect(getSuggestedCurrencyFromLocation()).resolves.toBe('USD');
  });

  it('returns normalized geojs data including currency', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        country: 'Sri Lanka',
        country_code: 'LK',
        timezone: 'Asia/Colombo',
      }),
    } as Response);

    await expect(getGeolocationData()).resolves.toEqual({
      ip: '1.2.3.4',
      country: 'Sri Lanka',
      countryCode: 'LK',
      timezone: 'Asia/Colombo',
      currency: 'LKR',
    });
  });

  it('returns null geolocation data on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

    await expect(getGeolocationData()).resolves.toBeNull();
  });

  it('maps ip-api response shape to normalized geolocation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: '4.3.2.1',
        country: 'United Kingdom',
        countryCode: 'GB',
        timezone: 'Europe/London',
      }),
    } as Response);

    await expect(getGeolocationDataFromIPAPI()).resolves.toEqual({
      ip: '4.3.2.1',
      country: 'United Kingdom',
      countryCode: 'GB',
      timezone: 'Europe/London',
      currency: 'GBP',
    });
  });

  it('validates country-currency mapping', () => {
    expect(isCurrencyForCountry('AE', 'AED')).toBe(true);
    expect(isCurrencyForCountry('AE', 'USD')).toBe(false);
  });

  it('returns primary and fallback supported currencies for known country', () => {
    const supported = getSupportedCurrenciesForCountry('GB');

    expect(supported[0]).toBe('GBP');
    expect(new Set(supported).size).toBe(supported.length);
    expect(supported).toContain('USD');
    expect(supported).toContain('EUR');
  });

  it('returns default currency list for unknown country', () => {
    expect(getSupportedCurrenciesForCountry('ZZ')).toEqual(['USD']);
  });

  it('returns default currency for timezone helper placeholder', () => {
    expect(getUserTimezoneCurrency()).toBe('USD');
  });
});
