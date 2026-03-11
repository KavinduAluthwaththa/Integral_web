'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { ShippingForm, ShippingFormData } from '@/components/checkout/shipping-form';
import { PaymentForm, PaymentFormData } from '@/components/checkout/payment-form';
import { OrderSummary } from '@/components/checkout/order-summary';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkCartStockAvailability, processOrderStock, reserveStock } from '@/lib/inventory';

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
  const { user } = useAuth();
  const { toast } = useToast();

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

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    if (!shippingData) return;

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
        payment_status: 'pending',
        payment_method: 'credit_card',
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
        .update({ payment_status: 'paid', status: 'processing' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      const stockProcessed = await processOrderStock(order.id, sessionId);

      if (!stockProcessed) {
        throw new Error('Failed to process stock for order');
      }

      setOrderNumber(order.order_number);
      await clearCart();
      setCurrentStep('confirmation');

      toast({
        title: 'Order placed successfully!',
        description: `Your order number is ${order.order_number}`,
      });
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
        <main className="bg-background min-h-screen py-5xl">
          <div className="max-w-2xl mx-auto px-xl">
            <div className="text-center space-y-3xl">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={40} className="text-green-600" strokeWidth={1.5} />
                </div>
              </div>

              <div className="space-y-lg">
                <h1 className="text-3xl font-light tracking-wide">
                  Order Confirmed!
                </h1>
                <p className="text-muted-foreground">
                  Thank you for your purchase. Your order has been confirmed and will be
                  shipped soon.
                </p>
              </div>

              <div className="bg-neutral-50 border border-foreground/10 p-xl space-y-md">
                <div className="space-y-sm">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Order Number
                  </p>
                  <p className="text-2xl font-light">{orderNumber}</p>
                </div>

                {shippingData && (
                  <div className="pt-lg border-t border-foreground/10 space-y-sm text-left">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Shipping To
                    </p>
                    <div className="text-sm space-y-xs">
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

              <div className="space-y-md pt-xl">
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

      <main className="bg-background min-h-screen py-5xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="mb-4xl">
            <h1 className="text-3xl font-light tracking-wide mb-lg">Checkout</h1>

            <div className="flex items-center gap-md">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-md flex-1">
                  <div className="flex items-center gap-sm flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors ${
                        step.completed
                          ? 'bg-foreground text-background border-foreground'
                          : currentStep === step.id
                          ? 'border-foreground text-foreground'
                          : 'border-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {step.completed ? (
                        <Check size={16} strokeWidth={2} />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`text-sm tracking-wide ${
                        currentStep === step.id
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-px ${
                        step.completed ? 'bg-foreground' : 'bg-foreground/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5xl">
            <div className="lg:col-span-2">
              {currentStep === 'shipping' && (
                <ShippingForm
                  onSubmit={handleShippingSubmit}
                  initialData={shippingData || initialShippingData}
                />
              )}

              {currentStep === 'payment' && (
                <PaymentForm
                  onSubmit={handlePaymentSubmit}
                  onBack={() => setCurrentStep('shipping')}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            <div className="lg:col-span-1">
              <OrderSummary shippingCost={shippingCost} tax={tax} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
