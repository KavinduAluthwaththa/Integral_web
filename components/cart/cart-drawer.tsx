'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/lib/cart-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getStockInfo, StockInfo } from '@/lib/inventory';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const {
    items,
    subtotal,
    discount,
    total,
    couponCode,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clearCart,
    isLoading,
  } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [stockInfoByVariantId, setStockInfoByVariantId] = useState<Record<string, StockInfo>>({});

  const freeShippingThreshold = 100;
  const amountToFreeShipping = useMemo(
    () => Math.max(0, freeShippingThreshold - subtotal),
    [subtotal]
  );

  useEffect(() => {
    const loadStockInfo = async () => {
      if (!isOpen || items.length === 0) {
        setStockInfoByVariantId({});
        return;
      }

      const entries = await Promise.all(
        items.map(async (item) => [item.variant_id, await getStockInfo(item.variant_id)] as const)
      );

      setStockInfoByVariantId(Object.fromEntries(entries));
    };

    void loadStockInfo();
  }, [isOpen, items]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    onClose();
    router.push('/checkout');
  };

  const handleQuantityChange = async (variantId: string, quantity: number) => {
    try {
      setPendingVariantId(variantId);
      await updateQuantity(variantId, quantity);
      const refreshedStockInfo = await getStockInfo(variantId);
      setStockInfoByVariantId((current) => ({
        ...current,
        [variantId]: refreshedStockInfo,
      }));
    } catch (error) {
      const refreshedStockInfo = await getStockInfo(variantId);
      setStockInfoByVariantId((current) => ({
        ...current,
        [variantId]: refreshedStockInfo,
      }));

      toast({
        title: 'Cart update failed',
        description: getErrorMessage(error, 'Unable to update the item quantity. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setPendingVariantId(null);
    }
  };

  const handleRemoveItem = async (variantId: string) => {
    try {
      setPendingVariantId(variantId);
      await removeItem(variantId);
      toast({
        title: 'Item removed',
        description: 'The item has been removed from your cart.',
      });
    } catch (error) {
      toast({
        title: 'Remove failed',
        description: getErrorMessage(error, 'Unable to remove the item right now. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setPendingVariantId(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;

    setIsApplyingCoupon(true);
    const result = await applyCoupon(couponInput);
    setIsApplyingCoupon(false);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
      setCouponInput('');
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleClearCart = async () => {
    try {
      setIsClearingCart(true);
      await clearCart();
      toast({
        title: 'Cart cleared',
        description: 'All items have been removed from your cart.',
      });
    } catch {
      toast({
        title: 'Clear cart failed',
        description: 'Unable to clear your cart right now. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClearingCart(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast({
      title: 'Coupon removed',
      description: 'Coupon code has been removed from your cart',
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
          role="presentation"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-lg bg-background z-50 transform transition-transform duration-300 flex flex-col shadow-2xl',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* Header */}
        <header className="flex items-center justify-between p-xl border-b border-foreground/10">
          <h2 className="text-xl font-light tracking-wider">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-sm hover:opacity-60 transition-opacity"
            aria-label="Close cart"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </header>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-xl py-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-lg">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              <p className="text-muted-foreground text-sm">Loading cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-lg">
              <p className="text-muted-foreground text-sm">Your cart is empty</p>
              <Button variant="outline" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-foreground/10">
              {items.map((item) => (
                <div key={item.variant_id} className="flex gap-lg py-lg first:pt-0 last:pb-0">
                  {(() => {
                    const stockInfo = stockInfoByVariantId[item.variant_id];
                    const canIncreaseQuantity = stockInfo ? item.quantity < stockInfo.available : true;

                    return (
                      <>
                  <Link
                    href={`/product/${item.sku}`}
                    onClick={onClose}
                    className="relative w-24 h-32 bg-neutral-100 flex-shrink-0 overflow-hidden group"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  <div className="flex-1 flex flex-col justify-between gap-md">
                    <div className="space-y-sm">
                      <Link
                        href={`/product/${item.sku}`}
                        onClick={onClose}
                        className="text-sm tracking-wide hover:text-muted-foreground transition-colors"
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-center justify-between gap-md text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <p>Size {item.size}</p>
                        <p>Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-light">${item.price.toFixed(2)} each</p>
                      {stockInfo && (
                        <p className={cn(
                          'text-[10px] uppercase tracking-[0.2em]',
                          stockInfo.isOutOfStock
                            ? 'text-red-600'
                            : stockInfo.isLowStock
                            ? 'text-orange-600'
                            : 'text-muted-foreground'
                        )}>
                          {stockInfo.isOutOfStock
                            ? 'Out of stock'
                            : stockInfo.isLowStock
                            ? `Only ${stockInfo.available} left`
                            : `${stockInfo.available} available`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-md">
                      <div className="flex items-center gap-xs border-2 border-foreground/40">
                        <button
                          onClick={() => handleQuantityChange(item.variant_id, item.quantity - 1)}
                          disabled={pendingVariantId === item.variant_id || isClearingCart}
                          className="p-xs hover:bg-neutral-100 transition-colors disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} strokeWidth={1.5} />
                        </button>
                        <span className="px-md text-sm min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.variant_id, item.quantity + 1)}
                          disabled={pendingVariantId === item.variant_id || isClearingCart || !canIncreaseQuantity}
                          className="p-xs hover:bg-neutral-100 transition-colors disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.variant_id)}
                        disabled={pendingVariantId === item.variant_id || isClearingCart}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-foreground/10 p-xl space-y-lg">
            <div className="border-2 border-foreground/40 px-md py-md space-y-1">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Delivery
              </p>
              {amountToFreeShipping > 0 ? (
                <p className="text-xs uppercase tracking-[0.2em] text-foreground">
                  Add ${amountToFreeShipping.toFixed(2)} more for free standard shipping
                </p>
              ) : (
                <p className="text-xs uppercase tracking-[0.2em] text-foreground">
                  Free standard shipping unlocked
                </p>
              )}
            </div>

            {/* Coupon Code */}
            <div className="space-y-sm">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Promo Code
              </label>
              {couponCode ? (
                <div className="flex items-center justify-between p-md bg-neutral-100 border-2 border-foreground/40">
                  <div className="flex items-center gap-sm">
                    <Tag size={16} strokeWidth={1.5} />
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                        Applied
                      </p>
                      <span className="text-sm font-medium">{couponCode}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-sm">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyCoupon();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponInput.trim() || isClearingCart}
                    className="whitespace-nowrap"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-sm pt-lg border-t border-foreground/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-sm border-t border-foreground/10">
                <span className="text-sm uppercase tracking-wider">Total</span>
                <span className="text-xl font-light">${total.toFixed(2)}</span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Shipping and tax finalize at checkout
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-sm">
              <Button
                variant="default"
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isLoading || isClearingCart || items.length === 0}
              >
                Checkout
              </Button>
              <Button variant="outline" className="w-full" onClick={handleClearCart} disabled={isLoading || isClearingCart}>
                {isClearingCart ? 'Clearing...' : 'Clear Cart'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose} disabled={isClearingCart}>
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
