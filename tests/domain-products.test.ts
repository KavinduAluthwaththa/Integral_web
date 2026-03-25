import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  getFeaturedProducts,
  getProductNameSuggestions,
  getShopFilterData,
  getShopProducts,
} from '@/lib/domain/products';

interface BuilderResult {
  data?: any;
  error?: any;
  count?: number | null;
}

function createBuilder(options: {
  awaitResult?: BuilderResult;
  limitResult?: BuilderResult;
  rangeResult?: BuilderResult;
}) {
  const builder: any = {};

  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.or = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);

  builder.limit = vi.fn().mockResolvedValue(
    options.limitResult || options.awaitResult || { data: [], error: null }
  );

  builder.range = vi.fn().mockResolvedValue(
    options.rangeResult || options.awaitResult || { data: [], error: null, count: 0 }
  );

  builder.then = (onFulfilled: (value: any) => unknown, onRejected?: (reason: unknown) => unknown) => {
    return Promise.resolve(options.awaitResult || { data: [], error: null }).then(onFulfilled, onRejected);
  };

  return builder;
}

describe('domain products service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns featured products using featured query when available', async () => {
    const featuredBuilder = createBuilder({
      limitResult: {
        error: null,
        data: [
          { id: 'p1', sku: 'SKU-1', name: 'Hoodie', images: ['https://img/1.jpg'] },
          { id: 'p2', sku: 'SKU-2', name: 'Tee', images: [123, 'https://img/2.jpg'] },
        ],
      },
    });

    fromMock.mockReturnValueOnce(featuredBuilder);

    const result = await getFeaturedProducts(2);

    expect(result).toEqual([
      { id: 'p1', sku: 'SKU-1', name: 'Hoodie', image: 'https://img/1.jpg' },
      { id: 'p2', sku: 'SKU-2', name: 'Tee', image: 'https://img/2.jpg' },
    ]);
    expect(featuredBuilder.eq).toHaveBeenCalledWith('is_featured', true);
    expect(featuredBuilder.limit).toHaveBeenCalledWith(2);
  });

  it('falls back to latest products when no featured rows are found', async () => {
    const featuredBuilder = createBuilder({
      limitResult: {
        error: null,
        data: [],
      },
    });

    const fallbackBuilder = createBuilder({
      limitResult: {
        error: null,
        data: [{ id: 'p3', sku: 'SKU-3', name: 'Jacket', images: [] }],
      },
    });

    fromMock.mockReturnValueOnce(featuredBuilder).mockReturnValueOnce(fallbackBuilder);

    const result = await getFeaturedProducts(1);

    expect(result).toEqual([
      { id: 'p3', sku: 'SKU-3', name: 'Jacket', image: null },
    ]);
    expect(fallbackBuilder.limit).toHaveBeenCalledWith(1);
  });

  it('returns empty list when fallback query fails', async () => {
    const featuredBuilder = createBuilder({
      limitResult: {
        error: null,
        data: [],
      },
    });

    const fallbackBuilder = createBuilder({
      limitResult: {
        error: { message: 'failed' },
        data: null,
      },
    });

    fromMock.mockReturnValueOnce(featuredBuilder).mockReturnValueOnce(fallbackBuilder);

    await expect(getFeaturedProducts(3)).resolves.toEqual([]);
  });

  it('returns unique trimmed product name suggestions', async () => {
    const namesBuilder = createBuilder({
      limitResult: {
        error: null,
        data: [
          { name: ' Hoodie ' },
          { name: 'Hoodie' },
          { name: 'Pants' },
          { name: '' },
          { name: null },
        ],
      },
    });

    fromMock.mockReturnValueOnce(namesBuilder);

    await expect(getProductNameSuggestions(120)).resolves.toEqual(['Hoodie', 'Pants']);
    expect(namesBuilder.limit).toHaveBeenCalledWith(120);
  });

  it('returns filter defaults when filter query fails', async () => {
    const builder = createBuilder({
      awaitResult: {
        data: null,
        error: { message: 'error' },
      },
    });

    fromMock.mockReturnValueOnce(builder);

    await expect(getShopFilterData()).resolves.toEqual({
      productNames: [],
      categories: ['All'],
      colors: ['All'],
    });
  });

  it('returns sorted unique shop filter values', async () => {
    const builder = createBuilder({
      awaitResult: {
        error: null,
        data: [
          { name: 'Zeta Tee', category: 'Tops', color: 'Black' },
          { name: 'Alpha Tee', category: 'Tops', color: 'Black' },
          { name: 'Cargo', category: 'Bottoms', color: 'Olive' },
          { name: null, category: null, color: null },
        ],
      },
    });

    fromMock.mockReturnValueOnce(builder);

    await expect(getShopFilterData()).resolves.toEqual({
      productNames: ['Alpha Tee', 'Cargo', 'Zeta Tee'],
      categories: ['All', 'Bottoms', 'Tops'],
      colors: ['All', 'Black', 'Olive'],
    });
  });

  it('applies filters, search, sort, and pagination for shop products', async () => {
    const builder = createBuilder({
      rangeResult: {
        error: null,
        count: 11,
        data: [
          {
            id: 'p1',
            sku: 'SKU-1',
            name: 'Black Hoodie',
            price: 89.99,
            category: 'Hoodies',
            color: 'Black',
            images: [],
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });

    fromMock.mockReturnValueOnce(builder);

    const result = await getShopProducts({
      page: 2,
      pageSize: 5,
      category: 'Hoodies',
      color: 'Black',
      searchQuery: 'hoodie, black',
      sortBy: 'price-asc',
    });

    expect(builder.eq).toHaveBeenCalledWith('category', 'Hoodies');
    expect(builder.eq).toHaveBeenCalledWith('color', 'Black');
    expect(builder.or).toHaveBeenCalledWith(
      'name.ilike.%hoodie  black%,sku.ilike.%hoodie  black%,category.ilike.%hoodie  black%,color.ilike.%hoodie  black%'
    );
    expect(builder.order).toHaveBeenCalledWith('price', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(5, 9);

    expect(result.products).toHaveLength(1);
    expect(result.totalPages).toBe(3);
  });

  it('returns safe fallback when shop query errors', async () => {
    const builder = createBuilder({
      rangeResult: {
        error: { message: 'error' },
        data: null,
        count: null,
      },
    });

    fromMock.mockReturnValueOnce(builder);

    await expect(
      getShopProducts({
        page: 1,
        pageSize: 8,
        category: 'All',
        color: 'All',
        searchQuery: '',
        sortBy: 'newest',
      })
    ).resolves.toEqual({
      products: [],
      totalPages: 1,
    });
  });
});
