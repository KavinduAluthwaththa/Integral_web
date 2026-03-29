'use client';

import Image from 'next/image';
import { useCart } from '@/lib/cart-context';
import { PriceDisplay } from '@/components/currency/price-display';

interface OrderSummaryProps {
  shippingCost?: number;
  tax?: number;
}

export function OrderSummary({ shippingCost = 0, tax = 0 }: OrderSummaryProps) {
  const { items, subtotal, discount, couponCode } = useCart();

  const total = subtotal - discount + shippingCost + tax;

  return (
    <div className="border-2 border-foreground/40 bg-background">
      <div className="border-b border-foreground/10 px-xl py-lg">
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Order Summary
        </p>
        <h2 className="mt-sm text-2xl font-light tracking-wide">Review</h2>
      </div>

      <div className="space-y-xl px-xl py-xl">
        <div className="space-y-lg">
          {items.map((item) => (
            <div key={item.variant_id} className="flex gap-md border-b border-foreground/10 pb-lg last:border-b-0 last:pb-0">
              <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden border-2 border-foreground/40 bg-secondary">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 25vw, 120px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-sm">
                <p className="text-sm tracking-wide">{item.name}</p>
                <div className="flex items-center justify-between gap-md text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Size {item.size}</span>
                  <span>Qty {item.quantity}</span>
                </div>
                <PriceDisplay
                  amount={item.price * item.quantity}
                  baseCurrency="USD"
                  className="text-sm font-light"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-2 border-foreground/40 px-md py-md">
          <p className="font-display text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Delivery
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-foreground">
            {shippingCost === 0 ? 'Free standard shipping included' : 'Standard shipping calculated below'}
          </p>
        </div>

        <div className="space-y-md border-t border-foreground/10 pt-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <PriceDisplay amount={subtotal} baseCurrency="USD" />
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Discount {couponCode && `(${couponCode})`}
              </span>
              <span className="text-green-600">
                -<PriceDisplay amount={discount} baseCurrency="USD" />
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {shippingCost === 0 ? 'Free' : <PriceDisplay amount={shippingCost} baseCurrency="USD" />}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <PriceDisplay amount={tax} baseCurrency="USD" />
          </div>

          <div className="flex items-center justify-between border-t border-foreground/10 pt-md">
            <span className="text-sm uppercase tracking-wider font-medium">Total</span>
            <PriceDisplay amount={total} baseCurrency="USD" className="text-xl font-light" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Taxes finalize with shipping destination
          </p>
        </div>
      </div>
    </div>
  );
}
