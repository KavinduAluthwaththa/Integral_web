import { supabase } from './supabase';
import {
  OrderConfirmationData,
  ShipmentUpdateData,
  ReturnConfirmationData,
  NewsletterSubscriptionData,
} from './email-templates';

type EmailType = 'order_confirmation' | 'shipment_update' | 'return_confirmation' | 'newsletter_subscription';

interface SendEmailParams {
  type: EmailType;
  to: string;
  recipientName?: string;
  data: any;
}

interface EmailNotificationRecord {
  email_type: EmailType;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
  metadata: any;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const { type, to, recipientName, data } = params;

  let subject = '';

  switch (type) {
    case 'order_confirmation':
      subject = `Order Confirmation - #${data.orderNumber}`;
      break;
    case 'shipment_update':
      subject = `Your Order Has Shipped - #${data.orderNumber}`;
      break;
    case 'return_confirmation':
      subject = `Return Confirmation - #${data.returnNumber}`;
      break;
    case 'newsletter_subscription':
      subject = 'Welcome to Our Newsletter';
      break;
  }

  const notificationRecord: Partial<EmailNotificationRecord> = {
    email_type: type,
    recipient_email: to,
    recipient_name: recipientName || null,
    subject,
    status: 'pending',
    metadata: data,
  };

  const { data: notification, error: dbError } = await supabase
    .from('email_notifications')
    .insert(notificationRecord)
    .select()
    .single();

  if (dbError || !notification) {
    console.error('Failed to create email notification record:', dbError);
    return { success: false, error: 'Failed to create notification record' };
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, to, data }),
    });

    const result = await response.json();

    if (result.success) {
      await supabase
        .from('email_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      return { success: true, notificationId: notification.id };
    } else {
      await supabase
        .from('email_notifications')
        .update({
          status: 'failed',
          error_message: result.error || 'Unknown error',
        })
        .eq('id', notification.id);

      return { success: false, error: result.error };
    }
  } catch (error: any) {
    await supabase
      .from('email_notifications')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', notification.id);

    return { success: false, error: error.message };
  }
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return sendEmail({
    type: 'order_confirmation',
    to: data.customerEmail,
    recipientName: data.customerName,
    data,
  });
}

export async function sendShipmentUpdateEmail(data: ShipmentUpdateData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return sendEmail({
    type: 'shipment_update',
    to: data.customerEmail,
    recipientName: data.customerName,
    data,
  });
}

export async function sendReturnConfirmationEmail(data: ReturnConfirmationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return sendEmail({
    type: 'return_confirmation',
    to: data.customerEmail,
    recipientName: data.customerName,
    data,
  });
}

export async function sendNewsletterSubscriptionEmail(data: NewsletterSubscriptionData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return sendEmail({
    type: 'newsletter_subscription',
    to: data.email,
    recipientName: data.firstName,
    data,
  });
}

export async function subscribeToNewsletter(email: string, firstName?: string, preferences?: string[]): Promise<{ success: boolean; error?: string }> {
  const { data: existingSubscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, status')
    .eq('email', email)
    .maybeSingle();

  if (existingSubscriber) {
    if (existingSubscriber.status === 'active') {
      return { success: false, error: 'Email already subscribed' };
    }

    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        first_name: firstName,
        preferences: preferences ? { preferences } : {},
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      })
      .eq('id', existingSubscriber.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        first_name: firstName,
        preferences: preferences ? { preferences } : {},
        status: 'active',
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  await sendNewsletterSubscriptionEmail({ email, firstName, preferences });

  return { success: true };
}

export async function unsubscribeFromNewsletter(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('email', email)
    .eq('status', 'active');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getEmailNotifications(recipientEmail?: string, status?: 'pending' | 'sent' | 'failed'): Promise<EmailNotificationRecord[]> {
  let query = supabase
    .from('email_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (recipientEmail) {
    query = query.eq('recipient_email', recipientEmail);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch email notifications:', error);
    return [];
  }

  return data || [];
}

export async function retryFailedEmail(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const { data: notification, error: fetchError } = await supabase
    .from('email_notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError || !notification) {
    return { success: false, error: 'Notification not found' };
  }

  if (notification.status !== 'failed') {
    return { success: false, error: 'Notification is not in failed status' };
  }

  return sendEmail({
    type: notification.email_type,
    to: notification.recipient_email,
    recipientName: notification.recipient_name || undefined,
    data: notification.metadata,
  });
}
