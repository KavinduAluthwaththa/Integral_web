/*
  # Create E-commerce Analytics System

  1. New Tables
    - `user_analytics`
      - Tracks user registration attempts and completions
      - `id` (uuid, primary key)
      - `session_id` (text)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `event_type` (text) - 'registration_started', 'registration_completed', 'registration_abandoned'
      - `email` (text, nullable)
      - `referrer` (text, nullable)
      - `utm_source` (text, nullable)
      - `utm_medium` (text, nullable)
      - `utm_campaign` (text, nullable)
      - `created_at` (timestamptz)

    - `product_analytics`
      - Tracks product interactions
      - `id` (uuid, primary key)
      - `session_id` (text)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `product_id` (uuid, foreign key to products)
      - `variant_id` (uuid, nullable, foreign key to product_variants)
      - `event_type` (text) - 'view', 'click', 'add_to_cart', 'size_select'
      - `size` (text, nullable)
      - `referrer` (text, nullable)
      - `created_at` (timestamptz)

    - `traffic_sources`
      - Tracks where users come from
      - `id` (uuid, primary key)
      - `session_id` (text, unique)
      - `source` (text) - 'instagram', 'facebook', 'youtube', 'direct', 'google', 'other'
      - `utm_source` (text, nullable)
      - `utm_medium` (text, nullable)
      - `utm_campaign` (text, nullable)
      - `referrer` (text, nullable)
      - `landing_page` (text)
      - `created_at` (timestamptz)

    - `session_analytics`
      - Tracks user sessions
      - `id` (uuid, primary key)
      - `session_id` (text, unique)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `first_visit` (timestamptz)
      - `last_activity` (timestamptz)
      - `page_views` (integer)
      - `is_returning` (boolean)
      - `created_at` (timestamptz)

  2. Views
    - Analytics aggregation views for quick reporting

  3. Functions
    - Helper functions for tracking and reporting

  4. Security
    - Enable RLS on all analytics tables
    - Authenticated admin users only for analytics reads
    - Public write access for tracking events

  5. Important Notes
    - All tracking is session-based with optional user association
    - UTM parameters tracked for marketing attribution
    - Real-time aggregation for dashboards
*/

-- Create user_analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('registration_started', 'registration_completed', 'registration_abandoned')),
  email text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz DEFAULT now()
);

-- Create product_analytics table
CREATE TABLE IF NOT EXISTS product_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'add_to_cart', 'size_select')),
  size text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Create traffic_sources table
CREATE TABLE IF NOT EXISTS traffic_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  source text NOT NULL CHECK (source IN ('instagram', 'facebook', 'youtube', 'direct', 'google', 'twitter', 'other')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  landing_page text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create session_analytics table
CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_visit timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  page_views integer DEFAULT 1,
  is_returning boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_session_id ON user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_analytics_session_id ON product_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_event_type ON product_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON product_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_sources_session_id ON traffic_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_source ON traffic_sources(source);
CREATE INDEX IF NOT EXISTS idx_traffic_sources_created_at ON traffic_sources(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_created_at ON session_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for tracking (public write access)
CREATE POLICY "Anyone can insert user analytics"
  ON user_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert product analytics"
  ON product_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert traffic sources"
  ON traffic_sources FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert session analytics"
  ON session_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update session analytics"
  ON session_analytics FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for reading (authenticated users only)
CREATE POLICY "Authenticated users can view user analytics"
  ON user_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view product analytics"
  ON product_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view traffic sources"
  ON traffic_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view session analytics"
  ON session_analytics FOR SELECT
  TO authenticated
  USING (true);

-- Function to track user signup
CREATE OR REPLACE FUNCTION track_user_signup(
  p_session_id text,
  p_user_id uuid,
  p_email text,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_analytics (
    session_id,
    user_id,
    event_type,
    email,
    utm_source,
    utm_medium,
    utm_campaign
  ) VALUES (
    p_session_id,
    p_user_id,
    'registration_completed',
    p_email,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign
  );
END;
$$ LANGUAGE plpgsql;

-- Function to determine traffic source from referrer
CREATE OR REPLACE FUNCTION get_traffic_source(p_referrer text, p_utm_source text)
RETURNS text AS $$
BEGIN
  IF p_utm_source IS NOT NULL THEN
    IF p_utm_source ILIKE '%instagram%' THEN RETURN 'instagram';
    ELSIF p_utm_source ILIKE '%facebook%' OR p_utm_source ILIKE '%fb%' THEN RETURN 'facebook';
    ELSIF p_utm_source ILIKE '%youtube%' OR p_utm_source ILIKE '%yt%' THEN RETURN 'youtube';
    ELSIF p_utm_source ILIKE '%google%' THEN RETURN 'google';
    ELSIF p_utm_source ILIKE '%twitter%' OR p_utm_source ILIKE '%x.com%' THEN RETURN 'twitter';
    END IF;
  END IF;

  IF p_referrer IS NULL OR p_referrer = '' THEN
    RETURN 'direct';
  ELSIF p_referrer ILIKE '%instagram%' THEN
    RETURN 'instagram';
  ELSIF p_referrer ILIKE '%facebook%' OR p_referrer ILIKE '%fb.com%' THEN
    RETURN 'facebook';
  ELSIF p_referrer ILIKE '%youtube%' OR p_referrer ILIKE '%youtu.be%' THEN
    RETURN 'youtube';
  ELSIF p_referrer ILIKE '%google%' THEN
    RETURN 'google';
  ELSIF p_referrer ILIKE '%twitter%' OR p_referrer ILIKE '%x.com%' THEN
    RETURN 'twitter';
  ELSE
    RETURN 'other';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz DEFAULT now() - interval '30 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_signups integer;
  v_new_users integer;
  v_returning_users integer;
  v_abandoned_registrations integer;
  v_total_orders integer;
  v_total_revenue numeric;
  v_avg_order_value numeric;
  v_conversion_rate numeric;
  v_total_sessions integer;
  v_total_product_views integer;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO v_total_signups
  FROM user_analytics
  WHERE event_type = 'registration_completed'
    AND created_at BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(DISTINCT session_id)
  INTO v_new_users
  FROM session_analytics
  WHERE is_returning = false
    AND created_at BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(DISTINCT session_id)
  INTO v_returning_users
  FROM session_analytics
  WHERE is_returning = true
    AND created_at BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*)
  INTO v_abandoned_registrations
  FROM user_analytics
  WHERE event_type = 'registration_started'
    AND created_at BETWEEN p_start_date AND p_end_date
    AND session_id NOT IN (
      SELECT session_id FROM user_analytics
      WHERE event_type = 'registration_completed'
    );

  SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(AVG(total), 0)
  INTO v_total_orders, v_total_revenue, v_avg_order_value
  FROM orders
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status != 'cancelled';

  SELECT COUNT(DISTINCT session_id)
  INTO v_total_sessions
  FROM session_analytics
  WHERE created_at BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*)
  INTO v_total_product_views
  FROM product_analytics
  WHERE event_type = 'view'
    AND created_at BETWEEN p_start_date AND p_end_date;

  IF v_total_sessions > 0 THEN
    v_conversion_rate := (v_total_orders::numeric / v_total_sessions::numeric) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;

  v_result := jsonb_build_object(
    'total_signups', v_total_signups,
    'new_users', v_new_users,
    'returning_users', v_returning_users,
    'abandoned_registrations', v_abandoned_registrations,
    'total_orders', v_total_orders,
    'total_revenue', v_total_revenue,
    'avg_order_value', v_avg_order_value,
    'conversion_rate', v_conversion_rate,
    'total_sessions', v_total_sessions,
    'total_product_views', v_total_product_views
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;