'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getSessionId(): string {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const total = useMemo(() =>
    Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  const itemCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  useEffect(() => {
    loadCart();
    const savedCoupon = localStorage.getItem('cart_coupon');
    if (savedCoupon) {
      const { code, discount: savedDiscount } = JSON.parse(savedCoupon);
      setCouponCode(code);
      setDiscount(savedDiscount);
    }
  }, []);

  useEffect(() => {
    if (couponCode) {
      recalculateDiscount();
    }
  }, [subtotal, couponCode]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const sessionId = getSessionId();

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
        .eq('session_id', sessionId);

      if (error) throw error;

      if (data) {
        const cartItems: CartItem[] = data.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          name: item.products.name,
          price: item.products.price,
          size: item.product_variants.size,
          quantity: item.quantity,
          image: item.products.images[0],
          sku: item.products.sku,
        }));
        setItems(cartItems);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, 'id'>) => {
    try {
      const sessionId = getSessionId();

      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('session_id', sessionId)
        .eq('variant_id', item.variant_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            session_id: sessionId,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          });

        if (error) throw error;
      }

      await loadCart();
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    try {
      const sessionId = getSessionId();

      if (quantity <= 0) {
        await removeItem(variantId);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('session_id', sessionId)
        .eq('variant_id', variantId);

      if (error) throw error;

      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const removeItem = async (variantId: string) => {
    try {
      const sessionId = getSessionId();

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId)
        .eq('variant_id', variantId);

      if (error) throw error;

      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        return { success: false, message: 'Invalid coupon code' };
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { success: false, message: 'This coupon has expired' };
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return { success: false, message: 'This coupon has reached its usage limit' };
      }

      if (coupon.min_purchase && subtotal < coupon.min_purchase) {
        return {
          success: false,
          message: `Minimum purchase of $${coupon.min_purchase.toFixed(2)} required`,
        };
      }

      let calculatedDiscount = 0;
      if (coupon.discount_type === 'percentage') {
        calculatedDiscount = (subtotal * coupon.discount_value) / 100;
      } else {
        calculatedDiscount = coupon.discount_value;
      }

      calculatedDiscount = Math.min(calculatedDiscount, subtotal);

      setCouponCode(code.toUpperCase());
      setDiscount(calculatedDiscount);
      localStorage.setItem(
        'cart_coupon',
        JSON.stringify({ code: code.toUpperCase(), discount: calculatedDiscount })
      );

      return { success: true, message: 'Coupon applied successfully!' };
    } catch (error) {
      console.error('Error applying coupon:', error);
      return { success: false, message: 'Error applying coupon' };
    }
  };

  const recalculateDiscount = async () => {
    if (!couponCode) return;

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .eq('active', true)
      .maybeSingle();

    if (!coupon) {
      removeCoupon();
      return;
    }

    let calculatedDiscount = 0;
    if (coupon.discount_type === 'percentage') {
      calculatedDiscount = (subtotal * coupon.discount_value) / 100;
    } else {
      calculatedDiscount = coupon.discount_value;
    }

    calculatedDiscount = Math.min(calculatedDiscount, subtotal);
    setDiscount(calculatedDiscount);
    localStorage.setItem(
      'cart_coupon',
      JSON.stringify({ code: couponCode, discount: calculatedDiscount })
    );
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setDiscount(0);
    localStorage.removeItem('cart_coupon');
  };

  const clearCart = async () => {
    try {
      const sessionId = getSessionId();

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;

      setItems([]);
      removeCoupon();
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        discount,
        total,
        couponCode,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
