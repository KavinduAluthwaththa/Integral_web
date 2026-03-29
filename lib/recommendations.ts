import { getSessionId } from './analytics';
import { Product, supabase } from './supabase';

const GUEST_RECENTLY_VIEWED_KEY = 'recentlyViewed';

type ProductPreference = Pick<Product, 'id' | 'category' | 'color' | 'created_at'>;

export interface RecentlyViewedProduct extends Product {
  viewed_at: string;
}

export interface RecommendedProduct extends Product {
  recommendationReason: string;
  recommendationScore: number;
}

interface RecommendationParams {
  currentProduct: Product;
  userId?: string;
  limit?: number;
}

interface RecommendationClickParams {
  recommendedProductId: string;
  sourceContext: string;
  sourceProductId?: string;
  userId?: string;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function getGuestRecentlyViewedIds(): string[] {
  if (!isBrowser()) return [];

  try {
    const stored = localStorage.getItem(GUEST_RECENTLY_VIEWED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setGuestRecentlyViewedIds(productIds: string[]) {
  if (!isBrowser()) return;
  localStorage.setItem(GUEST_RECENTLY_VIEWED_KEY, JSON.stringify(productIds));
}

function buildPreferenceMap(products: ProductPreference[]) {
  const categoryWeights = new Map<string, number>();
  const colorWeights = new Map<string, number>();

  products.forEach((product, index) => {
    const weight = Math.max(1, products.length - index);
    categoryWeights.set(product.category, (categoryWeights.get(product.category) || 0) + weight);
    colorWeights.set(product.color, (colorWeights.get(product.color) || 0) + weight);
  });

  return { categoryWeights, colorWeights };
}

function scoreRecommendation(
  candidate: Product,
  currentProduct: Product,
  categoryWeights: Map<string, number>,
  colorWeights: Map<string, number>
) {
  let score = 0;
  const reasons: string[] = [];

  if (candidate.category === currentProduct.category) {
    score += 8;
    reasons.push('Similar category');
  }

  if (candidate.color === currentProduct.color) {
    score += 4;
    reasons.push('Matching color');
  }

  const categoryAffinity = categoryWeights.get(candidate.category) || 0;
  const colorAffinity = colorWeights.get(candidate.color) || 0;

  if (categoryAffinity > 0) {
    score += categoryAffinity * 2;
    reasons.push('Based on your browsing');
  }

  if (colorAffinity > 0) {
    score += colorAffinity;
    reasons.push('Matches your preferred palette');
  }

  const recencyBoost = Math.max(0, 30 - Math.floor((Date.now() - new Date(candidate.created_at).getTime()) / 86400000));
  score += Math.min(recencyBoost, 6);

  return {
    score,
    reason: reasons[0] || 'Recommended for you',
  };
}

async function getUserPreferenceProducts(userId: string): Promise<ProductPreference[]> {
  const [favoritesResult, recentlyViewedResult] = await Promise.all([
    supabase
      .from('user_favorites')
      .select('products(id, category, color, created_at, is_hidden)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('recently_viewed')
      .select('products(id, category, color, created_at, is_hidden)')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(12),
  ]);

  const favorites = (favoritesResult.data || [])
    .map((entry: any) => entry.products)
    .filter((product: any) => product && !product.is_hidden) as ProductPreference[];
  const recentlyViewed = (recentlyViewedResult.data || [])
    .map((entry: any) => entry.products)
    .filter((product: any) => product && !product.is_hidden) as ProductPreference[];

  return [...recentlyViewed, ...favorites];
}

async function getGuestPreferenceProducts(): Promise<ProductPreference[]> {
  const recentIds = getGuestRecentlyViewedIds().slice(0, 12);
  if (recentIds.length === 0) return [];

  const { data } = await supabase
    .from('products')
    .select('id, category, color, created_at')
    .eq('is_hidden', false)
    .in('id', recentIds);

  const productMap = new Map((data || []).map((product: any) => [product.id, product as ProductPreference]));
  return recentIds.map((id) => productMap.get(id)).filter(Boolean) as ProductPreference[];
}

export async function recordRecentlyViewedProduct(productId: string, userId?: string) {
  try {
    if (userId) {
      await supabase.from('recently_viewed').delete().eq('user_id', userId).eq('product_id', productId);

      await supabase.from('recently_viewed').insert({
        user_id: userId,
        product_id: productId,
        viewed_at: new Date().toISOString(),
      });

      return;
    }

    const currentIds = getGuestRecentlyViewedIds();
    const nextIds = [productId, ...currentIds.filter((id) => id !== productId)].slice(0, 10);
    setGuestRecentlyViewedIds(nextIds);
  } catch (error) {
    console.error('Failed to record recently viewed product:', error);
  }
}

export async function getRecentlyViewedProducts(params: {
  userId?: string;
  excludeProductId?: string;
  limit?: number;
}): Promise<RecentlyViewedProduct[]> {
  const { userId, excludeProductId, limit = 4 } = params;

  try {
    if (userId) {
      const { data } = await supabase
        .from('recently_viewed')
        .select(`
          viewed_at,
          products (
            id,
            sku,
            name,
            description,
            price,
            category,
            color,
            images,
            is_hidden,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(limit + (excludeProductId ? 1 : 0));

      return (data || [])
        .map((entry: any) => ({ ...(entry.products as Product), viewed_at: entry.viewed_at }))
        .filter((product) => product.id !== excludeProductId && !product.is_hidden)
        .slice(0, limit);
    }

    const guestIds = getGuestRecentlyViewedIds().filter((id) => id !== excludeProductId).slice(0, limit);
    if (guestIds.length === 0) return [];

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_hidden', false)
      .in('id', guestIds);

    const productMap = new Map((data || []).map((product: any) => [product.id, product as Product]));

    return guestIds
      .map((id, index) => {
        const product = productMap.get(id);
        if (!product) return null;

        return {
          ...product,
          viewed_at: new Date(Date.now() - index * 60000).toISOString(),
        };
      })
      .filter(Boolean) as RecentlyViewedProduct[];
  } catch (error) {
    console.error('Failed to load recently viewed products:', error);
    return [];
  }
}

export async function getProductRecommendations(params: RecommendationParams): Promise<RecommendedProduct[]> {
  const { currentProduct, userId, limit = 4 } = params;

  try {
    const [candidateResult, preferenceProducts] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('is_hidden', false)
        .neq('id', currentProduct.id)
        .limit(60),
      userId ? getUserPreferenceProducts(userId) : getGuestPreferenceProducts(),
    ]);

    const candidates = (candidateResult.data || []) as Product[];
    const { categoryWeights, colorWeights } = buildPreferenceMap(preferenceProducts);

    return candidates
      .map((candidate) => {
        const { score, reason } = scoreRecommendation(candidate, currentProduct, categoryWeights, colorWeights);
        return {
          ...candidate,
          recommendationScore: score,
          recommendationReason: reason,
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    return [];
  }
}

export async function trackRecommendationClick(params: RecommendationClickParams) {
  const { recommendedProductId, sourceContext, sourceProductId, userId } = params;

  try {
    await supabase.from('recommendation_events').insert({
      session_id: getSessionId(),
      user_id: userId || null,
      source_context: sourceContext,
      source_product_id: sourceProductId || null,
      recommended_product_id: recommendedProductId,
      clicked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to track recommendation click:', error);
  }
}

export async function trackRecommendationAddToCart(productId: string, userId?: string) {
  try {
    const sessionId = getSessionId();

    let query = supabase
      .from('recommendation_events')
      .select('id')
      .eq('session_id', sessionId)
      .eq('recommended_product_id', productId)
      .is('converted_order_id', null)
      .order('clicked_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data } = await query.maybeSingle();

    if (!data?.id) return;

    await supabase
      .from('recommendation_events')
      .update({ added_to_cart_at: new Date().toISOString() })
      .eq('id', data.id);
  } catch (error) {
    console.error('Failed to track recommendation add to cart:', error);
  }
}

export async function attributeRecommendationConversions(params: {
  orderId: string;
  userId?: string;
  purchasedItems: Array<{ productId: string; revenue: number }>;
}) {
  try {
    const { orderId, userId, purchasedItems } = params;
    const sessionId = getSessionId();

    for (const item of purchasedItems) {
      let query = supabase
        .from('recommendation_events')
        .select('id')
        .eq('session_id', sessionId)
        .eq('recommended_product_id', item.productId)
        .is('converted_order_id', null)
        .order('clicked_at', { ascending: false })
        .limit(1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data } = await query.maybeSingle();
      if (!data?.id) continue;

      await supabase
        .from('recommendation_events')
        .update({
          converted_order_id: orderId,
          converted_at: new Date().toISOString(),
          attributed_revenue: item.revenue,
        })
        .eq('id', data.id);
    }
  } catch (error) {
    console.error('Failed to attribute recommendation conversions:', error);
  }
}