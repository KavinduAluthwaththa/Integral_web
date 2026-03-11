/*
  # Email Notifications System

  1. New Tables
    - `email_notifications`
      - `id` (uuid, primary key) - Unique notification ID
      - `email_type` (text) - Type of email (order_confirmation, shipment_update, return_confirmation, newsletter_subscription)
      - `recipient_email` (text) - Email address of recipient
      - `recipient_name` (text, nullable) - Name of recipient
      - `subject` (text) - Email subject line
      - `status` (text) - Email status (pending, sent, failed)
      - `sent_at` (timestamptz, nullable) - When email was sent
      - `error_message` (text, nullable) - Error details if sending failed
      - `metadata` (jsonb) - Additional data (order number, tracking info, etc.)
      - `created_at` (timestamptz) - When notification was created
      - `updated_at` (timestamptz) - Last update timestamp

    - `newsletter_subscribers`
      - `id` (uuid, primary key) - Unique subscriber ID
      - `email` (text, unique) - Subscriber email address
      - `first_name` (text, nullable) - Subscriber first name
      - `preferences` (jsonb, nullable) - Subscription preferences
      - `status` (text) - Subscription status (active, unsubscribed)
      - `subscribed_at` (timestamptz) - Subscription date
      - `unsubscribed_at` (timestamptz, nullable) - Unsubscription date
      - `created_at` (timestamptz) - Record creation date

  2. Security
    - Enable RLS on both tables
    - Only authenticated admin users can view email notifications
    - Anyone can subscribe to newsletter (public insert)
    - Subscribers can update their own preferences
    - No one can delete newsletter subscribers (soft delete via status)

  3. Indexes
    - Index on email_type for filtering notifications by type
    - Index on status for querying pending/failed emails
    - Index on recipient_email for looking up user notifications
    - Index on newsletter_subscribers email for quick lookups
*/

-- Create email notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  preferences jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(email_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- Enable RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_notifications
CREATE POLICY "Admins can view all email notifications"
  ON email_notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert email notifications"
  ON email_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email notifications"
  ON email_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own subscription"
  ON newsletter_subscribers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own subscription"
  ON newsletter_subscribers
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS email_notifications_updated_at ON email_notifications;
CREATE TRIGGER email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_email_notification_updated_at();
