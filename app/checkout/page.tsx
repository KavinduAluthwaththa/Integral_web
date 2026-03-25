'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { ShippingForm, ShippingFormData } from '@/components/checkout/shipping-form';
import { PaymentForm, PaymentFormData } from '@/components/checkout/payment-form';
import { OrderSummary } from '@/components/checkout/order-summary';
import { PriceDisplay } from '@/components/currency/price-display';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/lib/currency-context-geo';
import { checkCartStockAvailability, processOrderStock, reserveStock } from '@/lib/inventory';
import { sendOrderConfirmationEmail } from '@/lib/email-service';
import { attributeRecommendationConversions } from '@/lib/recommendations';

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, discount, couponCode, clearCart } = useCart();
  const { user, session } = useAuth();
  const { currentCurrency } = useCurrency();
  const { toast } = useToast();
  const enableDemoCard = process.env.NEXT_PUBLIC_ENABLE_DEMO_CARD === 'true';

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [initialShippingData, setInitialShippingData] = useState<Partial<ShippingFormData>>({});

  const shippingCost = subtotal >= 100 ? 0 : 9.99;
  const tax = (subtotal - discount + shippingCost) * 0.08;
  const total = subtotal - discount + shippingCost + tax;

  useEffect(() => {
    if (items.length === 0 && currentStep !== 'confirmation') {
      router.push('/shop');
    }
  }, [items.length, currentStep, router]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: defaultAddress } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (profile || defaultAddress) {
        setInitialShippingData({
          fullName: defaultAddress?.full_name || profile?.full_name || '',
          email: user.email || '',
          phone: defaultAddress?.phone || profile?.phone || '',
          addressLine1: defaultAddress?.address_line1 || '',
          addressLine2: defaultAddress?.address_line2 || '',
          city: defaultAddress?.city || '',
          state: defaultAddress?.state || '',
          postalCode: defaultAddress?.postal_code || '',
          country: defaultAddress?.country || 'United States',
        });
      }
    };

    loadUserData();
  }, [user]);

  const handleShippingSubmit = async (data: ShippingFormData) => {
    const cartItems = items.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity
    }));

    const unavailableItems = await checkCartStockAvailability(cartItems);

    if (unavailableItems.length > 0) {
      const itemNames = unavailableItems.map(item => {
        const cartItem = items.find(i => i.variant_id === item.variant_id);
        return cartItem ? `${cartItem.name} (${cartItem.size})` : 'Unknown item';
      }).join(', ');

      toast({
        title: 'Items unavailable',
        description: `The following items are no longer available or have insufficient stock: ${itemNames}`,
        variant: 'destructive',
      });
      return;
    }

    const sessionId = getSessionId();
    let allReserved = true;

    for (const item of items) {
      const reserved = await reserveStock(item.variant_id, item.quantity, sessionId);
      if (!reserved) {
        allReserved = false;
        break;
      }
    }

    if (!allReserved) {
      toast({
        title: 'Unable to reserve items',
        description: 'Some items could not be reserved. Please check your cart and try again.',
        variant: 'destructive',
      });
      return;
    }

    setShippingData(data);
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = async (_paymentData?: PaymentFormData | null) => {
    if (!shippingData) return;

    if (!session?.access_token) {
      toast({ title: 'Authentication required', description: 'Please sign in again before paying.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      const sessionId = getSessionId();

      const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
        'generate_order_number'
      );

      if (orderNumberError) throw orderNumberError;

      const orderData = {
        order_number: orderNumberData,
        session_id: sessionId,
        user_id: user?.id || null,
        status: 'pending',
        subtotal: subtotal,
        discount: discount,
        shipping_cost: shippingCost,
        tax: tax,
        total: total,
        coupon_code: couponCode,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const shippingAddress = {
        order_id: order.id,
        full_name: shippingData.fullName,
        email: shippingData.email,
        phone: shippingData.phone,
        address_line1: shippingData.addressLine1,
        address_line2: shippingData.addressLine2 || null,
        city: shippingData.city,
        state: shippingData.state,
        postal_code: shippingData.postalCode,
        country: shippingData.country,
      };

      const { error: addressError } = await supabase
        .from('shipping_addresses')
        .insert(shippingAddress);

      if (addressError) throw addressError;

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      const stockProcessed = await processOrderStock(order.id, sessionId);

      if (!stockProcessed) {
        throw new Error('Failed to process stock for order');
      }

      if (couponCode) {
        const { data: couponRedeemed, error: couponRedeemError } = await supabase.rpc(
          'redeem_coupon',
          { p_code: couponCode }
        );

        if (couponRedeemError || !couponRedeemed) {
          throw couponRedeemError || new Error('Failed to redeem coupon');
        }
      }

      await attributeRecommendationConversions({
        orderId: order.id,
        userId: user?.id,
        purchasedItems: items.map((item) => ({
          productId: item.product_id,
          revenue: item.price * item.quantity,
        })),
      });

      try {
        await sendOrderConfirmationEmail({
          orderNumber: order.order_number,
          customerName: shippingData.fullName,
          customerEmail: shippingData.email,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          items: items.map((item) => ({
            name: item.name,
            sku: item.sku,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          shipping: shippingCost,
          tax,
          total,
          shippingAddress: {
            street: shippingData.addressLine1,
            city: shippingData.city,
            state: shippingData.state,
            zipCode: shippingData.postalCode,
            country: shippingData.country,
          },
        });
      } catch (emailError) {
        console.error('Order confirmation email failed:', emailError);
      }

      const initiateResponse = await fetch('/api/payments/payhere/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, currency: currentCurrency }),
      });

      if (!initiateResponse.ok) {
        throw new Error('Failed to initiate PayHere payment');
      }

      const { endpoint, payload } = await initiateResponse.json();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = endpoint;

      Object.entries(payload).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      await clearCart();
      form.submit();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Payment failed',
        description: 'There was an error processing your payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { id: 'shipping', label: 'Shipping', completed: currentStep !== 'shipping' },
    {
      id: 'payment',
      label: 'Payment',
      completed: currentStep === 'confirmation',
    },
    { id: 'confirmation', label: 'Confirmation', completed: false },
  ];

  if (currentStep === 'confirmation') {
    return (
      <>
        <Navbar cartCount={0} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-2xl mx-auto px-xl">
            <div className="space-y-2xl text-center">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center border-2 border-foreground bg-foreground text-background">
                  <Check size={36} strokeWidth={1.5} />
                </div>
              </div>

              <div className="space-y-md">
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Confirmation
                </p>
                <h1 className="text-3xl font-light tracking-wide">Order Confirmed</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Thank you for your purchase. Your order has been confirmed and will be
                  shipped soon.
                </p>
              </div>

              <div className="border-2 border-foreground bg-background p-xl text-left">
                <div className="space-y-sm border-b border-foreground/10 pb-lg text-center">
                  <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Order Number
                  </p>
                  <p className="text-2xl font-light tracking-wide">{orderNumber}</p>
                </div>

                {shippingData && (
                  <div className="space-y-sm pt-lg">
                    <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Shipping To
                    </p>
                    <div className="space-y-xs text-sm">
                      <p>{shippingData.fullName}</p>
                      <p>{shippingData.addressLine1}</p>
                      {shippingData.addressLine2 && <p>{shippingData.addressLine2}</p>}
                      <p>
                        {shippingData.city}, {shippingData.state}{' '}
                        {shippingData.postalCode}
                      </p>
                      <p className="text-muted-foreground mt-md">{shippingData.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-md pt-md">
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to your email address.
                </p>
                <div className="flex gap-md justify-center">
                  <Link href="/shop">
                    <Button variant="default" size="lg">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />

      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="mx-auto max-w-7xl px-xl">
          <div className="mb-3xl space-y-lg border-b border-foreground/10 pb-xl">
            <div className="space-y-md">
              <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Secure Checkout
              </p>
              <div className="flex flex-col gap-md lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-sm">
                  <h1 className="text-3xl font-light tracking-wide">Checkout</h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Finalize shipping, review your order, and complete payment in one clean flow.
                  </p>
                </div>
                <Link href="/shop" className="text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground">
                  Return to shop
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border-2 px-lg py-md transition-colors ${
                    currentStep === step.id
                      ? 'border-foreground bg-foreground text-background'
                      : step.completed
                      ? 'border-foreground text-foreground'
                      : 'border-foreground/20 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-md">
                    <span className="font-display text-[10px] uppercase tracking-[0.25em]">
                      Step {index + 1}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center border border-current text-sm">
                      {step.completed ? <Check size={16} strokeWidth={2} /> : index + 1}
                    </span>
                  </div>
                  <p className="mt-sm text-sm uppercase tracking-[0.2em]">{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2xl lg:grid-cols-[minmax(0,1.35fr)_380px] lg:items-start">
            <div className="border-2 border-foreground bg-background p-xl md:p-2xl">
              {currentStep === 'shipping' && (
                <ShippingForm
                  onSubmit={handleShippingSubmit}
                  initialData={shippingData || initialShippingData}
                />
              )}

              {currentStep === 'payment' && (enableDemoCard ? (
                <PaymentForm
                  onSubmit={handlePaymentSubmit}
                  onBack={() => setCurrentStep('shipping')}
                  isProcessing={isProcessing}
                />
              ) : (
                <div className="space-y-lg">
                  <div className="space-y-sm">
                    <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Payment
                    </p>
                    <h2 className="text-2xl font-light tracking-wide">Pay with PayHere</h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      You will be redirected to PayHere to complete this payment securely.
                    </p>
                  </div>

                  <div className="border-2 border-foreground px-lg py-md space-y-sm">
                    <p className="text-sm">
                      Estimated gateway amount:{' '}
                      <PriceDisplay amount={total} baseCurrency="USD" showCurrencyCode className="font-medium" />
                    </p>
                    <p className="text-xs text-muted-foreground">PayHere will charge in {currentCurrency}.</p>
                    <p className="text-xs text-muted-foreground">Order is created first, then you’ll be redirected.</p>
                  </div>

                  <div className="flex gap-md pt-lg border-t border-foreground/10">
                    <Button
                      type="button"
                      variant="default"
                      disabled={isProcessing}
                      className="flex-1"
                      onClick={() => void handlePaymentSubmit(null)}
                    >
                      {isProcessing ? 'Redirecting...' : 'Proceed to PayHere'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isProcessing}
                      className="flex-1"
                      onClick={() => setCurrentStep('shipping')}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:sticky lg:top-28">
              <OrderSummary shippingCost={shippingCost} tax={tax} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
