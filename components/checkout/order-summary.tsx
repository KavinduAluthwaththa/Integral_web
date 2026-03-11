'use client';

import Image from 'next/image';
import { useCart } from '@/lib/cart-context';

interface OrderSummaryProps {
  shippingCost?: number;
  tax?: number;
}

export function OrderSummary({ shippingCost = 0, tax = 0 }: OrderSummaryProps) {
  const { items, subtotal, discount, couponCode } = useCart();

  const total = subtotal - discount + shippingCost + tax;

  return (
    <div className="bg-neutral-50 border border-foreground/10 p-xl space-y-xl">
      <h2 className="text-xl font-light tracking-wider">Order Summary</h2>

      <div className="space-y-lg">
        {items.map((item) => (
          <div key={item.variant_id} className="flex gap-md">
            <div className="relative w-16 h-20 bg-white border border-foreground/10 flex-shrink-0 overflow-hidden">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 space-y-xs">
              <p className="text-sm tracking-wide">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Size: {item.size} • Qty: {item.quantity}
              </p>
              <p className="text-sm font-light">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-md pt-lg border-t border-foreground/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Discount {couponCode && `(${couponCode})`}
            </span>
            <span className="text-green-600">-${discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>
            {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pt-md border-t border-foreground/10">
          <span className="text-sm uppercase tracking-wider font-medium">Total</span>
          <span className="text-xl font-light">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
