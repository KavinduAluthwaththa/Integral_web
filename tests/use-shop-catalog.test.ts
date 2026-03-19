/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShopCatalog } from '@/hooks/catalog/use-shop-catalog';
import { getShopFilterData, getShopProducts } from '@/lib/domain/products';

vi.mock('@/lib/domain/products', () => ({
  getShopFilterData: vi.fn(),
  getShopProducts: vi.fn(),
}));

describe('useShopCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getShopFilterData).mockResolvedValue({
      productNames: ['Essential Hoodie', 'Wide Pants'],
      categories: ['All', 'Hoodies', 'Pants'],
      colors: ['All', 'Black', 'Gray'],
    });

    vi.mocked(getShopProducts).mockResolvedValue({
      products: [
        {
          id: 'p1',
          sku: 'SKU-1',
          name: 'Essential Hoodie',
          price: 89.99,
          category: 'Hoodies',
          color: 'Black',
          images: ['https://img.test/1.jpg'],
          created_at: '2026-03-13T00:00:00.000Z',
        },
      ],
      totalPages: 3,
    });
  });

  it('loads filters and initial product page', async () => {
    const { result } = renderHook(() => useShopCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getShopFilterData).toHaveBeenCalledTimes(1);
    expect(getShopProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 8,
      category: 'All',
      color: 'All',
      searchQuery: '',
      sortBy: 'newest',
    });

    expect(result.current.categories).toEqual(['All', 'Hoodies', 'Pants']);
    expect(result.current.colors).toEqual(['All', 'Black', 'Gray']);
    expect(result.current.productNames).toEqual(['Essential Hoodie', 'Wide Pants']);
    expect(result.current.products).toHaveLength(1);
    expect(result.current.totalPages).toBe(3);
  });

  it('resets page and re-queries when search changes', async () => {
    const { result } = renderHook(() => useShopCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(vi.mocked(getShopProducts)).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 8,
        category: 'All',
        color: 'All',
        searchQuery: '',
        sortBy: 'newest',
      });
    });

    act(() => {
      result.current.setSearchQuery('hoodie');
    });

    await waitFor(() => {
      expect(vi.mocked(getShopProducts)).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 8,
        category: 'All',
        color: 'All',
        searchQuery: 'hoodie',
        sortBy: 'newest',
      });
    });

    expect(result.current.page).toBe(1);
  });
});
