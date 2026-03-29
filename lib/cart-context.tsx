'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  addCartItem,
  calculateCouponDiscount,
  clearCartItems,
  clearStoredCoupon,
  getCartSessionId,
  getCouponValidationMessage,
  loadActiveCoupon,
  loadCartItems,
  loadStoredCoupon,
  persistStoredCoupon,
  removeCartItem,
  updateCartItemQuantity,
} from '@/lib/cart/service';
import type { CartItem } from '@/lib/cart/service';

export type { CartItem } from '@/lib/cart/service';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  uniqueItemCount: number;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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

  const uniqueItemCount = useMemo(() => items.length, [items]);

  useEffect(() => {
    const savedCoupon = loadStoredCoupon();

    if (savedCoupon) {
      setCouponCode(savedCoupon.code);
      setDiscount(savedCoupon.discount);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [user?.id]);

  const recalculateDiscount = useCallback(async () => {
    if (!couponCode) return;

    const coupon = await loadActiveCoupon(couponCode);
    const validationMessage = getCouponValidationMessage(coupon, subtotal);

    if (!coupon || validationMessage) {
      removeCoupon();
      return;
    }

    const calculatedDiscount = calculateCouponDiscount(coupon, subtotal);
    setDiscount(calculatedDiscount);
    persistStoredCoupon(couponCode, calculatedDiscount);
  }, [couponCode, subtotal]);

  useEffect(() => {
    if (couponCode) {
      void recalculateDiscount();
    }
  }, [couponCode, recalculateDiscount]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const sessionId = getCartSessionId();
      setItems(await loadCartItems(sessionId));
    } catch (error) {
      console.error('Error loading cart:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, 'id'>) => {
    try {
      const sessionId = getCartSessionId();
      await addCartItem(sessionId, user?.id, item);

      await loadCart();
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    try {
      const sessionId = getCartSessionId();

      if (quantity <= 0) {
        await removeItem(variantId);
        return;
      }

      await updateCartItemQuantity(sessionId, variantId, quantity);

      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const removeItem = async (variantId: string) => {
    try {
      const sessionId = getCartSessionId();
      await removeCartItem(sessionId, variantId);

      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalizedCode = code.toUpperCase();
      const coupon = await loadActiveCoupon(normalizedCode);
      const validationMessage = getCouponValidationMessage(coupon, subtotal);

      if (!coupon || validationMessage) {
        return { success: false, message: validationMessage || 'Invalid coupon code' };
      }

      const calculatedDiscount = calculateCouponDiscount(coupon, subtotal);

      setCouponCode(normalizedCode);
      setDiscount(calculatedDiscount);
      persistStoredCoupon(normalizedCode, calculatedDiscount);

      return { success: true, message: 'Coupon applied successfully!' };
    } catch (error) {
      console.error('Error applying coupon:', error);
      return { success: false, message: 'Error applying coupon' };
    }
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setDiscount(0);
    clearStoredCoupon();
  };

  const clearCart = async () => {
    try {
      const sessionId = getCartSessionId();
      await clearCartItems(sessionId);

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
        uniqueItemCount,
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
