export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: Array<{
    name: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface ShipmentUpdateData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface ReturnConfirmationData {
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  returnDate: string;
  items: Array<{
    name: string;
    sku: string;
    size: string;
    quantity: number;
    refundAmount: number;
  }>;
  totalRefund: number;
  refundMethod: string;
  processingTime: string;
}

export interface NewsletterSubscriptionData {
  email: string;
  firstName?: string;
  preferences?: string[];
}

export function generateOrderConfirmationEmail(data: OrderConfirmationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .order-info { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #000000; }
    .order-info p { margin: 8px 0; }
    .order-info strong { font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .items-table th { background-color: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .totals { margin: 30px 0; padding: 20px; background-color: #f9f9f9; }
    .totals-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .totals-row.total { font-size: 18px; font-weight: 600; padding-top: 12px; border-top: 2px solid #000000; margin-top: 12px; }
    .shipping-address { background-color: #f9f9f9; padding: 20px; margin: 20px 0; }
    .shipping-address h3 { margin-top: 0; font-weight: 600; }
    .footer { background-color: #f0f0f0; padding: 30px; text-align: center; color: #666; font-size: 14px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; margin: 20px 0; font-weight: 500; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ORDER CONFIRMED</h1>
    </div>

    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Thank you for your order! We're getting your items ready to ship.</p>

      <div class="order-info">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Order Date:</strong> ${data.orderDate}</p>
        <p><strong>Email:</strong> ${data.customerEmail}</p>
      </div>

      <h2 style="font-weight: 600; margin-top: 40px;">Order Items</h2>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>Qty</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>
                <strong>${item.name}</strong><br>
                <span style="color: #666; font-size: 14px;">${item.sku}</span>
              </td>
              <td>${item.size}</td>
              <td>${item.quantity}</td>
              <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>Shipping:</span>
          <span>$${data.shipping.toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>Tax:</span>
          <span>$${data.tax.toFixed(2)}</span>
        </div>
        <div class="totals-row total">
          <span>Total:</span>
          <span>$${data.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="shipping-address">
        <h3>Shipping Address</h3>
        <p>
          ${data.shippingAddress.street}<br>
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}<br>
          ${data.shippingAddress.country}
        </p>
      </div>

      <p style="margin-top: 40px;">You'll receive a shipping confirmation email with tracking information once your order ships.</p>

      <p>If you have any questions, feel free to reply to this email.</p>

      <p style="margin-top: 30px;">Best regards,<br><strong>The Team</strong></p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateShipmentUpdateEmail(data: ShipmentUpdateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .shipping-info { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #000000; }
    .shipping-info p { margin: 8px 0; }
    .shipping-info strong { font-weight: 600; }
    .tracking-box { background-color: #000000; color: #ffffff; padding: 20px; margin: 30px 0; text-align: center; }
    .tracking-number { font-size: 24px; font-weight: 600; letter-spacing: 2px; margin: 10px 0; }
    .button { display: inline-block; background-color: #ffffff; color: #000000; padding: 14px 32px; text-decoration: none; margin: 20px 0; font-weight: 500; letter-spacing: 1px; border: 2px solid #ffffff; }
    .button:hover { background-color: transparent; color: #ffffff; }
    .address-box { background-color: #f9f9f9; padding: 20px; margin: 20px 0; }
    .address-box h3 { margin-top: 0; font-weight: 600; }
    .footer { background-color: #f0f0f0; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>YOUR ORDER HAS SHIPPED</h1>
    </div>

    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Great news! Your order is on its way.</p>

      <div class="shipping-info">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Carrier:</strong> ${data.carrier}</p>
        <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
      </div>

      <div class="tracking-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; letter-spacing: 1px;">TRACKING NUMBER</p>
        <div class="tracking-number">${data.trackingNumber}</div>
        <a href="#" class="button">TRACK YOUR PACKAGE</a>
      </div>

      <div class="address-box">
        <h3>Shipping To</h3>
        <p>
          ${data.shippingAddress.street}<br>
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}<br>
          ${data.shippingAddress.country}
        </p>
      </div>

      <p style="margin-top: 40px;">Your package should arrive by <strong>${data.estimatedDelivery}</strong>. You can track your shipment using the tracking number above.</p>

      <p>If you have any questions about your delivery, please don't hesitate to contact us.</p>

      <p style="margin-top: 30px;">Best regards,<br><strong>The Team</strong></p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateReturnConfirmationEmail(data: ReturnConfirmationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .return-info { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #000000; }
    .return-info p { margin: 8px 0; }
    .return-info strong { font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .items-table th { background-color: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .refund-box { background-color: #e8f5e9; padding: 20px; margin: 30px 0; border-left: 4px solid #4caf50; }
    .refund-amount { font-size: 24px; font-weight: 600; color: #2e7d32; margin: 10px 0; }
    .footer { background-color: #f0f0f0; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RETURN CONFIRMED</h1>
    </div>

    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>We've received your return request and it's being processed.</p>

      <div class="return-info">
        <p><strong>Return Number:</strong> ${data.returnNumber}</p>
        <p><strong>Original Order:</strong> ${data.orderNumber}</p>
        <p><strong>Return Date:</strong> ${data.returnDate}</p>
      </div>

      <h2 style="font-weight: 600; margin-top: 40px;">Returned Items</h2>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>Qty</th>
            <th style="text-align: right;">Refund</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>
                <strong>${item.name}</strong><br>
                <span style="color: #666; font-size: 14px;">${item.sku}</span>
              </td>
              <td>${item.size}</td>
              <td>${item.quantity}</td>
              <td style="text-align: right;">$${item.refundAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="refund-box">
        <p style="margin: 0 0 10px 0; font-weight: 600;">Total Refund Amount</p>
        <div class="refund-amount">$${data.totalRefund.toFixed(2)}</div>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Refund Method: ${data.refundMethod}</p>
      </div>

      <p>Your refund will be processed within <strong>${data.processingTime}</strong>. The amount will be credited back to your original payment method.</p>

      <h3 style="font-weight: 600; margin-top: 40px;">What Happens Next?</h3>
      <ul style="line-height: 2;">
        <li>We'll inspect the returned items</li>
        <li>Once approved, your refund will be processed</li>
        <li>You'll receive a confirmation email when the refund is complete</li>
      </ul>

      <p>If you have any questions about your return, please don't hesitate to contact us.</p>

      <p style="margin-top: 30px;">Best regards,<br><strong>The Team</strong></p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateNewsletterSubscriptionEmail(data: NewsletterSubscriptionData): string {
  const greeting = data.firstName ? `Hi ${data.firstName}` : 'Hello';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Newsletter</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #000000; color: #ffffff; padding: 50px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 3px; }
    .content { padding: 40px 30px; }
    .welcome-box { background-color: #f9f9f9; padding: 30px; margin: 30px 0; text-align: center; border: 2px solid #000000; }
    .welcome-box h2 { margin: 0 0 15px 0; font-size: 24px; font-weight: 600; }
    .benefits { margin: 30px 0; }
    .benefit-item { display: flex; align-items: start; margin: 20px 0; }
    .benefit-icon { width: 40px; height: 40px; background-color: #000000; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px; flex-shrink: 0; }
    .benefit-text { flex: 1; }
    .benefit-text h3 { margin: 0 0 5px 0; font-size: 16px; font-weight: 600; }
    .benefit-text p { margin: 0; color: #666; font-size: 14px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 40px; text-decoration: none; margin: 20px 0; font-weight: 500; letter-spacing: 1px; }
    .footer { background-color: #f0f0f0; padding: 30px; text-align: center; color: #666; font-size: 14px; }
    .footer a { color: #666; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>WELCOME</h1>
    </div>

    <div class="content">
      <p>${greeting},</p>
      <p>Thank you for subscribing to our newsletter! We're excited to have you as part of our community.</p>

      <div class="welcome-box">
        <h2>You're All Set!</h2>
        <p>Get ready to receive exclusive updates, new arrivals, and special offers straight to your inbox.</p>
      </div>

      <h2 style="font-weight: 600; text-align: center; margin: 40px 0 30px 0;">What You'll Receive</h2>

      <div class="benefits">
        <div class="benefit-item">
          <div class="benefit-icon">1</div>
          <div class="benefit-text">
            <h3>Exclusive Offers</h3>
            <p>Be the first to know about sales, promotions, and subscriber-only discounts.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon">2</div>
          <div class="benefit-text">
            <h3>New Arrivals</h3>
            <p>Get early access to our latest products before they sell out.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon">3</div>
          <div class="benefit-text">
            <h3>Style Tips & Trends</h3>
            <p>Discover the latest fashion trends and styling inspiration.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon">4</div>
          <div class="benefit-text">
            <h3>Behind the Scenes</h3>
            <p>Get an insider look at our brand story and what we're working on.</p>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="#" class="button">START SHOPPING</a>
      </div>

      <p style="margin-top: 40px; text-align: center; color: #666;">We respect your inbox. You can update your preferences or unsubscribe at any time.</p>

      <p style="margin-top: 30px; text-align: center;">Best regards,<br><strong>The Team</strong></p>
    </div>

    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
      <p><a href="#">Manage Preferences</a> | <a href="#">Unsubscribe</a></p>
      <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
