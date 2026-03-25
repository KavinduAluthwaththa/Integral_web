import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@/lib/inventory', () => ({
  getAvailableStock: vi.fn(),
}));

import { calculateCouponDiscount, getCouponValidationMessage } from '@/lib/cart/service';

describe('cart service coupon helpers', () => {
  it('validates minimum purchase and usage constraints', () => {
    expect(
      getCouponValidationMessage(
        {
          code: 'SAVE10',
          active: true,
          expires_at: null,
          max_uses: 10,
          current_uses: 1,
          min_purchase: 100,
          discount_type: 'percentage',
          discount_value: 10,
        },
        50
      )
    ).toBe('Minimum purchase of $100.00 required');
  });

  it('caps discount values at subtotal', () => {
    expect(
      calculateCouponDiscount(
        {
          code: 'SAVE200',
          active: true,
          expires_at: null,
          max_uses: null,
          current_uses: 0,
          min_purchase: null,
          discount_type: 'fixed',
          discount_value: 200,
        },
        75
      )
    ).toBe(75);
  });
});