import { supabase } from '@/lib/supabase';

interface ProductSummaryRow {
  id: string;
  sku: string;
  name: string;
  images: unknown;
}

export interface FeaturedProduct {
  id: string;
  sku: string;
  name: string;
  image: string | null;
}

export interface ShopProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  color: string;
  images: string[];
  created_at: string;
}

interface ShopFilterRow {
  name: string | null;
  category: string | null;
  color: string | null;
}

export interface ShopFilterData {
  productNames: string[];
  categories: string[];
  colors: string[];
}

export type ShopSortBy = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

interface ShopQueryParams {
  page: number;
  pageSize: number;
  category: string;
  color: string;
  searchQuery: string;
  sortBy: ShopSortBy;
}

export interface ShopQueryResult {
  products: ShopProduct[];
  totalPages: number;
}

function getPrimaryImage(images: unknown): string | null {
  if (!Array.isArray(images)) {
    return null;
  }

  const first = images.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof first === 'string' ? first : null;
}

function mapFeaturedProducts(rows: ProductSummaryRow[]): FeaturedProduct[] {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    image: getPrimaryImage(row.images),
  }));
}

export async function getFeaturedProducts(limit = 3): Promise<FeaturedProduct[]> {
  const featuredResult = await supabase
    .from('products')
    .select('id, sku, name, images')
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!featuredResult.error && featuredResult.data && featuredResult.data.length > 0) {
    return mapFeaturedProducts(featuredResult.data as ProductSummaryRow[]);
  }

  const fallbackResult = await supabase
    .from('products')
    .select('id, sku, name, images')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fallbackResult.error || !fallbackResult.data) {
    return [];
  }

  return mapFeaturedProducts(fallbackResult.data as ProductSummaryRow[]);
}

export async function getProductNameSuggestions(limit = 120): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('name')
    .order('name', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return Array.from(
    new Set(
      data
        .map((row) => (typeof row.name === 'string' ? row.name.trim() : ''))
        .filter((name) => name.length > 0)
    )
  );
}

export async function getShopFilterData(): Promise<ShopFilterData> {
  const { data, error } = await supabase
    .from('products')
    .select('name, category, color')
    .order('name');

  if (error || !data) {
    return {
      productNames: [],
      categories: ['All'],
      colors: ['All'],
    };
  }

  const filterRows = data as ShopFilterRow[];
  const uniqueCategories = Array.from(
    new Set(filterRows.map((item) => item.category).filter((value): value is string => Boolean(value)))
  ).sort();
  const uniqueColors = Array.from(
    new Set(filterRows.map((item) => item.color).filter((value): value is string => Boolean(value)))
  ).sort();
  const uniqueNames = Array.from(
    new Set(filterRows.map((item) => item.name).filter((value): value is string => Boolean(value)))
  ).sort();

  return {
    productNames: uniqueNames,
    categories: ['All', ...uniqueCategories],
    colors: ['All', ...uniqueColors],
  };
}

export async function getShopProducts(params: ShopQueryParams): Promise<ShopQueryResult> {
  const { page, pageSize, category, color, searchQuery, sortBy } = params;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' });

  if (category !== 'All') {
    query = query.eq('category', category);
  }

  if (color !== 'All') {
    query = query.eq('color', color);
  }

  if (searchQuery.trim()) {
    const escaped = searchQuery.trim().replace(/,/g, ' ');
    query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,category.ilike.%${escaped}%,color.ilike.%${escaped}%`);
  }

  switch (sortBy) {
    case 'price-asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price', { ascending: false });
      break;
    case 'name-asc':
      query = query.order('name', { ascending: true });
      break;
    case 'name-desc':
      query = query.order('name', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    return {
      products: [],
      totalPages: 1,
    };
  }

  return {
    products: (data as ShopProduct[]) || [],
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}
