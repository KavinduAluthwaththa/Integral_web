/** @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomeCatalog } from '@/hooks/catalog/use-home-catalog';
import { getFeaturedProducts, getProductNameSuggestions } from '@/lib/domain/products';

vi.mock('@/lib/domain/products', () => ({
  getFeaturedProducts: vi.fn(),
  getProductNameSuggestions: vi.fn(),
}));

describe('useHomeCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads featured products and search suggestions', async () => {
    vi.mocked(getFeaturedProducts).mockResolvedValue([
      { id: 'p1', sku: 'SKU-1', name: 'Essential Hoodie', image: 'https://img.test/1.jpg' },
      { id: 'p2', sku: 'SKU-2', name: 'Wide Pants', image: 'https://img.test/2.jpg' },
    ]);
    vi.mocked(getProductNameSuggestions).mockResolvedValue(['Essential Hoodie', 'Wide Pants']);

    const { result } = renderHook(() => useHomeCatalog());

    expect(result.current.loadingFeaturedProducts).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingFeaturedProducts).toBe(false);
    });

    expect(getFeaturedProducts).toHaveBeenCalledWith(3);
    expect(getProductNameSuggestions).toHaveBeenCalledWith(120);
    expect(result.current.featuredProducts).toHaveLength(2);
    expect(result.current.productNames).toEqual(['Essential Hoodie', 'Wide Pants']);
  });

  it('handles empty service responses', async () => {
    vi.mocked(getFeaturedProducts).mockResolvedValue([]);
    vi.mocked(getProductNameSuggestions).mockResolvedValue([]);

    const { result } = renderHook(() => useHomeCatalog());

    await waitFor(() => {
      expect(result.current.loadingFeaturedProducts).toBe(false);
    });

    expect(result.current.featuredProducts).toEqual([]);
    expect(result.current.productNames).toEqual([]);
  });
});
