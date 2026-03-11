'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/lib/cart-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
  } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
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
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-lg">
              <p className="text-muted-foreground text-sm">Your cart is empty</p>
              <Button variant="outline" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-xl">
              {items.map((item) => (
                <div key={item.variant_id} className="flex gap-lg">
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

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-xs">
                      <Link
                        href={`/product/${item.sku}`}
                        onClick={onClose}
                        className="text-sm tracking-wide hover:text-muted-foreground transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                      <p className="text-sm font-light">${item.price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center justify-between mt-md">
                      <div className="flex items-center gap-xs border border-foreground/20">
                        <button
                          onClick={() =>
                            updateQuantity(item.variant_id, item.quantity - 1)
                          }
                          className="p-xs hover:bg-neutral-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} strokeWidth={1.5} />
                        </button>
                        <span className="px-md text-sm min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.variant_id, item.quantity + 1)
                          }
                          className="p-xs hover:bg-neutral-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.variant_id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-foreground/10 p-xl space-y-lg">
            {/* Coupon Code */}
            <div className="space-y-sm">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Coupon Code
              </label>
              {couponCode ? (
                <div className="flex items-center justify-between p-md bg-neutral-100 border border-foreground/10">
                  <div className="flex items-center gap-sm">
                    <Tag size={16} strokeWidth={1.5} />
                    <span className="text-sm font-medium">{couponCode}</span>
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
                    disabled={isApplyingCoupon || !couponInput.trim()}
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
            </div>

            {/* Actions */}
            <div className="space-y-sm">
              <Button
                variant="default"
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                Checkout
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
