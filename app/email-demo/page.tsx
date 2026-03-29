'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import {
  sendOrderConfirmationEmail,
  sendShipmentUpdateEmail,
  sendReturnConfirmationEmail,
  sendNewsletterSubscriptionEmail,
} from '@/lib/email-service';
import { Mail, Package, RotateCcw, Bell, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from 'lucide-react';

interface DemoProduct {
  name: string;
  sku: string;
  price: number;
  size: string;
}

export default function EmailDemoPage() {
  const { uniqueItemCount } = useCart();
  const [email, setEmail] = useState('test@example.com');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [demoProducts, setDemoProducts] = useState<DemoProduct[]>([]);

  useEffect(() => {
    const loadDemoProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('name, sku, price, product_variants(size)')
        .order('created_at', { ascending: false })
        .limit(2);

      if (!data) {
        setDemoProducts([]);
        return;
      }

      const mapped = (data as any[]).map((product) => {
        const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
        const firstVariant = variants[0];

        return {
          name: String(product.name || ''),
          sku: String(product.sku || ''),
          price: Number(product.price || 0),
          size: String(firstVariant?.size || 'One Size'),
        };
      }).filter((product) => product.name && product.sku && product.price > 0);

      setDemoProducts(mapped);
    };

    void loadDemoProducts();
  }, []);

  const handleSendOrderConfirmation = async () => {
    setLoading('order');
    if (demoProducts.length === 0) {
      setResults((prev) => ({
        ...prev,
        order: {
          success: false,
          message: 'No Supabase products available for email preview.',
        },
      }));
      setLoading(null);
      return;
    }

    const primary = demoProducts[0];
    const secondary = demoProducts[1] || demoProducts[0];

    const result = await sendOrderConfirmationEmail({
      orderNumber: 'ORD-2024-001',
      customerName: 'John Doe',
      customerEmail: email,
      orderDate: new Date().toLocaleDateString(),
      items: [
        { name: primary.name, sku: primary.sku, size: primary.size, quantity: 2, price: primary.price },
        { name: secondary.name, sku: secondary.sku, size: secondary.size, quantity: 1, price: secondary.price },
      ],
      subtotal: (primary.price * 2) + secondary.price,
      shipping: 10.00,
      tax: 12.00,
      total: (primary.price * 2) + secondary.price + 10 + 12,
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
    });

    setResults(prev => ({
      ...prev,
      order: {
        success: result.success,
        message: result.success ? 'Order confirmation email sent!' : result.error || 'Failed to send',
      },
    }));
    setLoading(null);
  };

  const handleSendShipmentUpdate = async () => {
    setLoading('shipment');
    const result = await sendShipmentUpdateEmail({
      orderNumber: 'ORD-2024-001',
      customerName: 'John Doe',
      customerEmail: email,
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
    });

    setResults(prev => ({
      ...prev,
      shipment: {
        success: result.success,
        message: result.success ? 'Shipment update email sent!' : result.error || 'Failed to send',
      },
    }));
    setLoading(null);
  };

  const handleSendReturnConfirmation = async () => {
    setLoading('return');
    if (demoProducts.length === 0) {
      setResults((prev) => ({
        ...prev,
        return: {
          success: false,
          message: 'No Supabase products available for return preview.',
        },
      }));
      setLoading(null);
      return;
    }

    const primary = demoProducts[0];

    const result = await sendReturnConfirmationEmail({
      returnNumber: 'RET-2024-001',
      orderNumber: 'ORD-2024-001',
      customerName: 'John Doe',
      customerEmail: email,
      returnDate: new Date().toLocaleDateString(),
      items: [
        { name: primary.name, sku: primary.sku, size: primary.size, quantity: 1, refundAmount: primary.price },
      ],
      totalRefund: primary.price,
      refundMethod: 'Original Payment Method',
      processingTime: '5-7 business days',
    });

    setResults(prev => ({
      ...prev,
      return: {
        success: result.success,
        message: result.success ? 'Return confirmation email sent!' : result.error || 'Failed to send',
      },
    }));
    setLoading(null);
  };

  const handleSendNewsletter = async () => {
    setLoading('newsletter');
    const result = await sendNewsletterSubscriptionEmail({
      email: email,
      firstName: 'John',
    });

    setResults(prev => ({
      ...prev,
      newsletter: {
        success: result.success,
        message: result.success ? 'Newsletter subscription email sent!' : result.error || 'Failed to send',
      },
    }));
    setLoading(null);
  };

  const EmailTestCard = ({
    title,
    description,
    icon: Icon,
    onSend,
    type,
  }: {
    title: string;
    description: string;
    icon: any;
    onSend: () => void;
    type: string;
  }) => {
    const result = results[type];
    const isLoading = loading === type;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={onSend} disabled={isLoading || !email} className="w-full">
            {isLoading ? 'Sending...' : 'Send Test Email'}
          </Button>

          {result && (
            <div
              className={`flex items-start gap-2 p-3 rounded text-sm ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <p>{result.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Navbar cartCount={uniqueItemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-light tracking-wide mb-2">Email System Demo</h1>
            <p className="text-muted-foreground">Test all email notification types</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">Test Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="max-w-md"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {demoProducts.length > 0
                ? `Using ${demoProducts.length} product${demoProducts.length === 1 ? '' : 's'} from Supabase for previews.`
                : 'No products found in Supabase yet. Add products to preview product-based emails.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmailTestCard
              title="Order Confirmation"
              description="Send a confirmation email with order details, items, and shipping information"
              icon={Mail}
              onSend={handleSendOrderConfirmation}
              type="order"
            />

            <EmailTestCard
              title="Shipment Update"
              description="Send a shipping notification with tracking number and delivery estimate"
              icon={Package}
              onSend={handleSendShipmentUpdate}
              type="shipment"
            />

            <EmailTestCard
              title="Return Confirmation"
              description="Send a return confirmation with refund details and processing time"
              icon={RotateCcw}
              onSend={handleSendReturnConfirmation}
              type="return"
            />

            <EmailTestCard
              title="Newsletter Subscription"
              description="Send a welcome email to new newsletter subscribers"
              icon={Bell}
              onSend={handleSendNewsletter}
              type="newsletter"
            />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Email System Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Professional HTML email templates with responsive design</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Database tracking of all email notifications with status monitoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Supabase Edge Function for secure server-side email processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Newsletter subscription management with unsubscribe functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Automatic retry mechanism for failed email deliveries</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span>Comprehensive metadata storage for order and shipment details</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
