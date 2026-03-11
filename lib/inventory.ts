import { supabase } from './supabase';

export interface StockInfo {
  available: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export const LOW_STOCK_THRESHOLD = 5;

export async function getAvailableStock(variantId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_available_stock', {
    p_variant_id: variantId,
  });

  if (error) {
    console.error('Error getting available stock:', error);
    return 0;
  }

  return data || 0;
}

export async function getStockInfo(variantId: string): Promise<StockInfo> {
  const available = await getAvailableStock(variantId);

  return {
    available,
    isLowStock: available > 0 && available <= LOW_STOCK_THRESHOLD,
    isOutOfStock: available === 0,
  };
}

export async function reserveStock(
  variantId: string,
  quantity: number,
  sessionId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('reserve_stock', {
    p_variant_id: variantId,
    p_quantity: quantity,
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Error reserving stock:', error);
    return false;
  }

  return data || false;
}

export async function releaseReservation(sessionId: string): Promise<void> {
  await supabase.rpc('release_reservation', {
    p_session_id: sessionId,
  });
}

export async function checkCartStockAvailability(
  cartItems: Array<{ variant_id: string; quantity: number }>
): Promise<Array<{ variant_id: string; requested: number; available: number }>> {
  const { data, error } = await supabase.rpc('check_cart_stock_availability', {
    p_cart_items: cartItems,
  });

  if (error) {
    console.error('Error checking cart stock:', error);
    return [];
  }

  return data || [];
}

export async function processOrderStock(
  orderId: string,
  sessionId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('process_order_stock', {
    p_order_id: orderId,
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Error processing order stock:', error);
    return false;
  }

  return data || false;
}

export async function updateStock(
  variantId: string,
  quantityChange: number,
  changeType: 'sale' | 'restock' | 'adjustment' | 'reservation' | 'release',
  orderId?: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_stock', {
    p_variant_id: variantId,
    p_quantity_change: quantityChange,
    p_change_type: changeType,
    p_order_id: orderId || null,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Error updating stock:', error);
    return false;
  }

  return data || false;
}

export function getStockStatusText(stockInfo: StockInfo): string {
  if (stockInfo.isOutOfStock) {
    return 'Out of Stock';
  }
  if (stockInfo.isLowStock) {
    return `Only ${stockInfo.available} left`;
  }
  return 'In Stock';
}

export function getStockStatusColor(stockInfo: StockInfo): string {
  if (stockInfo.isOutOfStock) {
    return 'text-red-600';
  }
  if (stockInfo.isLowStock) {
    return 'text-orange-600';
  }
  return 'text-green-600';
}
