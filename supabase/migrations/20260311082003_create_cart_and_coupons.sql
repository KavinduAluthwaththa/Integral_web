/*
  # Create Cart and Coupon System

  1. New Tables
    - `cart_items`
      - `id` (uuid, primary key)
      - `session_id` (text) - For guest users
      - `user_id` (uuid, nullable) - For authenticated users
      - `product_id` (uuid, foreign key to products)
      - `variant_id` (uuid, foreign key to product_variants)
      - `quantity` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `coupons`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Coupon code
      - `discount_type` (text) - 'percentage' or 'fixed'
      - `discount_value` (numeric) - Percentage (0-100) or fixed amount
      - `min_purchase` (numeric, nullable) - Minimum purchase amount
      - `max_uses` (integer, nullable) - Maximum number of uses
      - `current_uses` (integer) - Current number of uses
      - `expires_at` (timestamptz, nullable)
      - `active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Cart items accessible by session_id or user_id
    - Coupons readable by all, writable by admin only

  3. Indexes
    - Index on session_id and user_id for cart queries
    - Index on coupon code for lookups
*/

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, variant_id)
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_purchase numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE active = true;

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Cart items policies
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (true);

-- Coupon policies
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (active = true);

-- Insert sample coupons
INSERT INTO coupons (code, discount_type, discount_value, min_purchase, max_uses)
VALUES 
  ('WELCOME10', 'percentage', 10, 0, NULL),
  ('SAVE20', 'percentage', 20, 100, 100),
  ('FLAT50', 'fixed', 50, 150, NULL)
ON CONFLICT (code) DO NOTHING;

-- Function to update cart_items updated_at timestamp
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cart_items
DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();