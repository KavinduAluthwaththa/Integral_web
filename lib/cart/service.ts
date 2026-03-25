import { supabase } from '@/lib/supabase';
import { getAvailableStock } from '@/lib/inventory';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const CART_COUPON_STORAGE_KEY = 'cart_coupon';

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
  sku: string;
}

interface StoredCoupon {
  code: string;
  discount: number;
}

interface CouponRecord {
  code: string;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  min_purchase: number | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export function getCartSessionId(): string {
  let sessionId = localStorage.getItem(CART_SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

export function loadStoredCoupon(): StoredCoupon | null {
  const rawCoupon = localStorage.getItem(CART_COUPON_STORAGE_KEY);

  if (!rawCoupon) {
    return null;
  }

  try {
    return JSON.parse(rawCoupon) as StoredCoupon;
  } catch {
    localStorage.removeItem(CART_COUPON_STORAGE_KEY);
    return null;
  }
}

export function persistStoredCoupon(code: string, discount: number) {
  localStorage.setItem(CART_COUPON_STORAGE_KEY, JSON.stringify({ code, discount }));
}

export function clearStoredCoupon() {
  localStorage.removeItem(CART_COUPON_STORAGE_KEY);
}

function normalizeCartItems(data: any[]): CartItem[] {
  return data
    .filter((item) => item.products && item.product_variants)
    .map((item) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      name: item.products.name,
      price: item.products.price,
      size: item.product_variants.size,
      quantity: item.quantity,
      image: item.products.images?.[0] || '',
      sku: item.products.sku,
    }));
}

export async function loadCartItems(sessionId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      variant_id,
      quantity,
      products (
        name,
        price,
        images,
        sku
      ),
      product_variants (
        size
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return normalizeCartItems(data || []);
}

export async function addCartItem(
  sessionId: string,
  userId: string | null | undefined,
  item: Omit<CartItem, 'id'>
) {
  const availableStock = await getAvailableStock(item.variant_id);

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('session_id', sessionId)
    .eq('variant_id', item.variant_id)
    .maybeSingle();

  const nextQuantity = (existing?.quantity || 0) + item.quantity;

  validateRequestedQuantity(availableStock, nextQuantity);

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: nextQuantity })
      .eq('id', existing.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from('cart_items')
    .insert({
      session_id: sessionId,
      user_id: userId || null,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    });

  if (error) {
    throw error;
  }
}

export async function updateCartItemQuantity(sessionId: string, variantId: string, quantity: number) {
  const availableStock = await getAvailableStock(variantId);
  validateRequestedQuantity(availableStock, quantity);

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('session_id', sessionId)
    .eq('variant_id', variantId);

  if (error) {
    throw error;
  }
}

export async function removeCartItem(sessionId: string, variantId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('session_id', sessionId)
    .eq('variant_id', variantId);

  if (error) {
    throw error;
  }
}

export async function clearCartItems(sessionId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    throw error;
  }
}

export async function loadActiveCoupon(code: string): Promise<CouponRecord | null> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function getCouponValidationMessage(coupon: CouponRecord | null, subtotal: number): string | null {
  if (!coupon) {
    return 'Invalid coupon code';
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return 'This coupon has expired';
  }

  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return 'This coupon has reached its usage limit';
  }

  if (coupon.min_purchase && subtotal < coupon.min_purchase) {
    return `Minimum purchase of $${coupon.min_purchase.toFixed(2)} required`;
  }

  return null;
}

export function calculateCouponDiscount(coupon: CouponRecord, subtotal: number): number {
  const rawDiscount = coupon.discount_type === 'percentage'
    ? (subtotal * coupon.discount_value) / 100
    : coupon.discount_value;

  return Math.min(rawDiscount, subtotal);
}

function validateRequestedQuantity(availableStock: number, requestedQuantity: number) {
  if (availableStock <= 0) {
    throw new Error('This item is out of stock.');
  }

  if (requestedQuantity > availableStock) {
    throw new Error(`Only ${availableStock} item${availableStock === 1 ? '' : 's'} available.`);
  }
}