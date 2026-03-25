import { describe, expect, it } from 'vitest';
import { getStockStatusColor, getStockStatusText, getInventoryStatusColor } from '@/lib/inventory/stock-ui';
import { getReturnStatusBadgeColor, getReturnStatusLabel } from '@/lib/returns/status-ui';

describe('inventory stock ui helpers', () => {
  it('formats low stock values for product pages', () => {
    expect(getStockStatusText({ available: 3, isLowStock: true, isOutOfStock: false })).toBe('Only 3 left');
    expect(getStockStatusColor({ available: 3, isLowStock: true, isOutOfStock: false })).toBe('text-orange-600');
  });

  it('formats inventory dashboard statuses', () => {
    expect(getInventoryStatusColor('in_stock')).toBe('text-green-600');
    expect(getInventoryStatusColor('out_of_stock')).toBe('text-red-600');
  });
});

describe('return status ui helpers', () => {
  it('returns badge styles and readable labels', () => {
    expect(getReturnStatusBadgeColor('approved')).toContain('bg-blue-100');
    expect(getReturnStatusLabel('processing')).toBe('Processing');
  });
});