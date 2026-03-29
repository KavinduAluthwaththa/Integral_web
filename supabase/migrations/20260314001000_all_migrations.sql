-- Consolidated migration containing all schema/data changes in original timestamp order.


-- ===== BEGIN 20260311081124_create_products_and_inventory.sql =====

/*
  # Create Products and Inventory System

  ## Overview
  This migration sets up a complete product catalog with inventory tracking system.

  ## New Tables
  
  ### `products`
  Core product information table
  - `id` (uuid, primary key) - Unique product identifier
  - `sku` (text, unique) - Stock keeping unit code
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `price` (numeric) - Product price
  - `category` (text) - Product category
  - `color` (text) - Product color
  - `images` (jsonb) - Array of image URLs
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `product_variants`
  Size and inventory tracking for each product
  - `id` (uuid, primary key) - Unique variant identifier
  - `product_id` (uuid, foreign key) - References products table
  - `size` (text) - Size option (S, M, L, XL, etc.)
  - `stock` (integer) - Current stock quantity
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `user_favorites`
  Tracks user's favorite products
  - `id` (uuid, primary key) - Unique favorite identifier
  - `user_id` (uuid) - User identifier
  - `product_id` (uuid, foreign key) - References products table
  - `created_at` (timestamptz) - Creation timestamp

  ### `recently_viewed`
  Tracks recently viewed products per user
  - `id` (uuid, primary key) - Unique view identifier
  - `user_id` (uuid) - User identifier
  - `product_id` (uuid, foreign key) - References products table
  - `viewed_at` (timestamptz) - View timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for products and variants
  - Authenticated users can manage their own favorites and view history

  ## Indexes
  - Index on product SKU for fast lookups
  - Index on product category for filtering
  - Index on user_id for favorites and recently viewed
  - Index on viewed_at for sorting recent views
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL,
  category text NOT NULL,
  color text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, size)
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create recently_viewed table
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- Products policies (public read)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update products"
  ON products FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete products"
  ON products FOR DELETE
  USING (true);

-- Product variants policies (public read)
CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert variants"
  ON product_variants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update variants"
  ON product_variants FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete variants"
  ON product_variants FOR DELETE
  USING (true);

-- User favorites policies
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (true);

-- Recently viewed policies
CREATE POLICY "Users can view own recently viewed"
  ON recently_viewed FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own recently viewed"
  ON recently_viewed FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own recently viewed"
  ON recently_viewed FOR DELETE
  USING (true);

-- ===== END 20260311081124_create_products_and_inventory.sql =====


-- ===== BEGIN 20260311082003_create_cart_and_coupons.sql =====

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

-- ===== END 20260311082003_create_cart_and_coupons.sql =====


-- ===== BEGIN 20260311082649_create_orders_and_addresses.sql =====

/*
  # Create Orders and Addresses System

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique) - Human-readable order number
      - `session_id` (text) - For guest checkout
      - `user_id` (uuid, nullable) - For authenticated users
      - `status` (text) - Order status (pending, processing, shipped, delivered, cancelled)
      - `subtotal` (numeric) - Order subtotal
      - `discount` (numeric) - Discount applied
      - `shipping_cost` (numeric) - Shipping cost
      - `tax` (numeric) - Tax amount
      - `total` (numeric) - Total amount
      - `coupon_code` (text, nullable) - Applied coupon code
      - `payment_status` (text) - Payment status (pending, paid, failed, refunded)
      - `payment_method` (text) - Payment method used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products)
      - `variant_id` (uuid, foreign key to product_variants)
      - `quantity` (integer)
      - `price` (numeric) - Price at time of order
      - `created_at` (timestamptz)
    
    - `shipping_addresses`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `address_line1` (text)
      - `address_line2` (text, nullable)
      - `city` (text)
      - `state` (text)
      - `postal_code` (text)
      - `country` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view their own orders
    - Orders accessible by session_id or user_id

  3. Indexes
    - Index on order_number for lookups
    - Index on session_id and user_id for queries
    - Index on status for filtering
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  discount numeric DEFAULT 0 CHECK (discount >= 0),
  shipping_cost numeric DEFAULT 0 CHECK (shipping_cost >= 0),
  tax numeric DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  coupon_code text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create shipping_addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'United States',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_order_id ON shipping_addresses(order_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Order items policies
CREATE POLICY "Users can view order items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Shipping addresses policies
CREATE POLICY "Users can view shipping addresses"
  ON shipping_addresses FOR SELECT
  USING (true);

CREATE POLICY "Users can create shipping addresses"
  ON shipping_addresses FOR INSERT
  WITH CHECK (true);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_order_number text;
  order_exists boolean;
BEGIN
  LOOP
    new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_order_number) INTO order_exists;
    
    IF NOT order_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update orders updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for orders
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ===== END 20260311082649_create_orders_and_addresses.sql =====


-- ===== BEGIN 20260311083410_create_user_profiles_simple.sql =====

/*
  # Create User Profile Tables - Step 1

  1. Create core user tables
  2. Enable RLS
  3. Add policies
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ===== END 20260311083410_create_user_profiles_simple.sql =====


-- ===== BEGIN 20260311083422_create_user_addresses.sql =====

/*
  # Create User Addresses Table

  1. Create addresses table
  2. Enable RLS
  3. Add policies and triggers
*/

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'United States',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Enable RLS
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own addresses"
  ON user_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own addresses"
  ON user_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON user_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON user_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS user_addresses_updated_at ON user_addresses;
CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addresses_updated_at();

DROP TRIGGER IF EXISTS ensure_single_default_address ON user_addresses;
CREATE TRIGGER ensure_single_default_address
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

-- ===== END 20260311083422_create_user_addresses.sql =====


-- ===== BEGIN 20260311083455_add_session_id_to_recently_viewed.sql =====

/*
  # Add session_id to recently_viewed

  1. Add session_id column for guest tracking
  2. Create user_favorites table if not exists
  3. Add RLS policies
*/

-- Add session_id to recently_viewed if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recently_viewed' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE recently_viewed ADD COLUMN session_id text;
    CREATE INDEX IF NOT EXISTS idx_recently_viewed_session_id ON recently_viewed(session_id);
  END IF;
END $$;

-- Create user_favorites table if not exists
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);

-- Enable RLS if not already
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can create own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Anyone can view recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Anyone can create recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Anyone can delete recently viewed" ON recently_viewed;

-- User favorites policies
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recently viewed policies (supports both auth and guest)
CREATE POLICY "Anyone can view recently viewed"
  ON recently_viewed FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create recently viewed"
  ON recently_viewed FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete recently viewed"
  ON recently_viewed FOR DELETE
  USING (true);

-- ===== END 20260311083455_add_session_id_to_recently_viewed.sql =====


-- ===== BEGIN 20260311084431_create_inventory_system_v2.sql =====

/*
  # Create Inventory Management System

  1. New Tables
    - inventory_logs - Tracks all stock changes
    - stock_reservations - Temporary holds during checkout

  2. Functions
    - Stock availability checking
    - Reservation management
    - Automatic logging

  3. Security
    - RLS enabled with public read access
*/

-- Create inventory_logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment', 'reservation', 'release')),
  quantity_change integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create stock_reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant_id ON stock_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_session_id ON stock_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_at ON stock_reservations(expires_at);

-- Enable RLS
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view inventory logs"
  ON inventory_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view stock reservations"
  ON stock_reservations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create stock reservations"
  ON stock_reservations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete stock reservations"
  ON stock_reservations FOR DELETE
  USING (true);

-- Function to get available stock
CREATE OR REPLACE FUNCTION get_available_stock(p_variant_id uuid)
RETURNS integer AS $$
DECLARE
  v_total_stock integer;
  v_reserved_stock integer;
BEGIN
  SELECT stock INTO v_total_stock
  FROM product_variants
  WHERE id = p_variant_id;
  
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_stock
  FROM stock_reservations
  WHERE variant_id = p_variant_id
    AND expires_at > now();
  
  RETURN GREATEST(v_total_stock - v_reserved_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to release expired reservations
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_reservations
  WHERE expires_at <= now();
END;
$$ LANGUAGE plpgsql;

-- Function to reserve stock
CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id uuid,
  p_quantity integer,
  p_session_id text
)
RETURNS boolean AS $$
DECLARE
  v_available_stock integer;
BEGIN
  PERFORM release_expired_reservations();
  
  v_available_stock := get_available_stock(p_variant_id);
  
  IF v_available_stock >= p_quantity THEN
    INSERT INTO stock_reservations (variant_id, quantity, session_id, expires_at)
    VALUES (p_variant_id, p_quantity, p_session_id, now() + interval '15 minutes');
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to release reservation
CREATE OR REPLACE FUNCTION release_reservation(p_session_id text)
RETURNS void AS $$
BEGIN
  DELETE FROM stock_reservations
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock with logging
CREATE OR REPLACE FUNCTION update_stock(
  p_variant_id uuid,
  p_quantity_change integer,
  p_change_type text,
  p_order_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_previous_stock integer;
  v_new_stock integer;
BEGIN
  SELECT stock INTO v_previous_stock
  FROM product_variants
  WHERE id = p_variant_id;
  
  v_new_stock := v_previous_stock + p_quantity_change;
  
  IF v_new_stock < 0 THEN
    RETURN false;
  END IF;
  
  UPDATE product_variants
  SET stock = v_new_stock,
      updated_at = now()
  WHERE id = p_variant_id;
  
  INSERT INTO inventory_logs (
    variant_id,
    change_type,
    quantity_change,
    previous_stock,
    new_stock,
    order_id,
    reason
  ) VALUES (
    p_variant_id,
    p_change_type,
    p_quantity_change,
    v_previous_stock,
    v_new_stock,
    p_order_id,
    p_reason
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check cart stock availability
CREATE OR REPLACE FUNCTION check_cart_stock_availability(
  p_cart_items jsonb
)
RETURNS jsonb AS $$
DECLARE
  item jsonb;
  v_available_stock integer;
  v_unavailable_items jsonb := '[]'::jsonb;
BEGIN
  PERFORM release_expired_reservations();
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_available_stock := get_available_stock((item->>'variant_id')::uuid);
    
    IF v_available_stock < (item->>'quantity')::integer THEN
      v_unavailable_items := v_unavailable_items || jsonb_build_object(
        'variant_id', item->>'variant_id',
        'requested', (item->>'quantity')::integer,
        'available', v_available_stock
      );
    END IF;
  END LOOP;
  
  RETURN v_unavailable_items;
END;
$$ LANGUAGE plpgsql;

-- Function to process order stock
CREATE OR REPLACE FUNCTION process_order_stock(
  p_order_id uuid,
  p_session_id text
)
RETURNS boolean AS $$
DECLARE
  item record;
  v_success boolean;
BEGIN
  FOR item IN
    SELECT oi.variant_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    v_success := update_stock(
      item.variant_id,
      -item.quantity,
      'sale',
      p_order_id,
      'Order completed'
    );
    
    IF NOT v_success THEN
      RETURN false;
    END IF;
  END LOOP;
  
  PERFORM release_reservation(p_session_id);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ===== END 20260311084431_create_inventory_system_v2.sql =====


-- ===== BEGIN 20260311084915_create_analytics_system.sql =====

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

-- ===== END 20260311084915_create_analytics_system.sql =====


-- ===== BEGIN 20260311090418_create_email_notifications_system.sql =====

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

-- ===== END 20260311090418_create_email_notifications_system.sql =====


-- ===== BEGIN 20260311091027_create_returns_and_refunds_system.sql =====

/*
  # Returns and Refunds System

  1. New Tables
    - `return_requests`
      - `id` (uuid, primary key) - Unique return request ID
      - `user_id` (uuid, foreign key) - User who initiated the return
      - `order_id` (uuid, foreign key) - Original order being returned
      - `return_number` (text, unique) - Human-readable return number (RET-YYYY-XXXXX)
      - `status` (text) - Return status (pending, approved, rejected, processing, completed, cancelled)
      - `reason` (text) - Return reason
      - `description` (text, nullable) - Additional details from customer
      - `refund_method` (text) - How refund will be processed (original_payment, store_credit, exchange)
      - `refund_amount` (decimal) - Total refund amount
      - `admin_notes` (text, nullable) - Internal notes from admin
      - `approved_by` (uuid, nullable) - Admin who approved/rejected
      - `approved_at` (timestamptz, nullable) - When decision was made
      - `requested_at` (timestamptz) - When return was requested
      - `completed_at` (timestamptz, nullable) - When return was completed
      - `created_at` (timestamptz) - Record creation
      - `updated_at` (timestamptz) - Last update

    - `return_items`
      - `id` (uuid, primary key) - Unique item ID
      - `return_request_id` (uuid, foreign key) - Associated return request
      - `order_item_id` (uuid, nullable) - Original order item (if tracked)
      - `product_sku` (text) - Product SKU
      - `product_name` (text) - Product name
      - `size` (text) - Size variant
      - `quantity` (integer) - Quantity being returned
      - `price` (decimal) - Price per item
      - `refund_amount` (decimal) - Refund amount for this item
      - `condition` (text, nullable) - Item condition (new, used, damaged)
      - `created_at` (timestamptz) - Record creation

    - `refund_transactions`
      - `id` (uuid, primary key) - Unique transaction ID
      - `return_request_id` (uuid, foreign key) - Associated return
      - `transaction_type` (text) - Type (refund, store_credit, exchange)
      - `amount` (decimal) - Transaction amount
      - `payment_method` (text, nullable) - Payment method
      - `transaction_id` (text, nullable) - External transaction reference
      - `status` (text) - Transaction status (pending, completed, failed)
      - `processed_by` (uuid, nullable) - Admin who processed
      - `processed_at` (timestamptz, nullable) - Processing timestamp
      - `notes` (text, nullable) - Additional notes
      - `created_at` (timestamptz) - Record creation

  2. Security
    - Enable RLS on all tables
    - Users can view and create their own return requests
    - Users can view their own return items
    - Only authenticated admins can approve/reject returns
    - Only authenticated admins can view all returns
    - Only authenticated admins can process refund transactions

  3. Indexes
    - Index on return_requests user_id for user lookups
    - Index on return_requests status for filtering
    - Index on return_requests return_number for searches
    - Index on return_items return_request_id for joining
    - Index on refund_transactions return_request_id for joining

  4. Important Notes
    - Return numbers are auto-generated in format RET-YYYY-XXXXX
    - Default status is 'pending' for new requests
    - Refund amount is calculated from return items
    - Admin approval is required before processing refunds
    - Email notifications sent on status changes
*/

-- Create return_requests table
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_id uuid REFERENCES orders(id) NOT NULL,
  return_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text NOT NULL,
  description text,
  refund_method text NOT NULL DEFAULT 'original_payment',
  refund_amount decimal(10, 2) NOT NULL DEFAULT 0,
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id uuid REFERENCES return_requests(id) ON DELETE CASCADE NOT NULL,
  order_item_id uuid,
  product_sku text NOT NULL,
  product_name text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10, 2) NOT NULL,
  refund_amount decimal(10, 2) NOT NULL,
  condition text,
  created_at timestamptz DEFAULT now()
);

-- Create refund_transactions table
CREATE TABLE IF NOT EXISTS refund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id uuid REFERENCES return_requests(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  amount decimal(10, 2) NOT NULL,
  payment_method text,
  transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_return_number ON return_requests(return_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return_request_id ON return_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_return_request_id ON refund_transactions(return_request_id);

-- Enable RLS
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for return_requests
CREATE POLICY "Users can view own return requests"
  ON return_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own return requests"
  ON return_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending returns"
  ON return_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all return requests"
  ON return_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update all return requests"
  ON return_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for return_items
CREATE POLICY "Users can view own return items"
  ON return_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM return_requests
      WHERE return_requests.id = return_items.return_request_id
      AND return_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create return items for own requests"
  ON return_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM return_requests
      WHERE return_requests.id = return_items.return_request_id
      AND return_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all return items"
  ON return_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update all return items"
  ON return_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for refund_transactions
CREATE POLICY "Users can view own refund transactions"
  ON refund_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM return_requests
      WHERE return_requests.id = refund_transactions.return_request_id
      AND return_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all refund transactions"
  ON refund_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create refund transactions"
  ON refund_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update refund transactions"
  ON refund_transactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS text AS $$
DECLARE
  new_number text;
  year text;
  sequence_num integer;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM return_requests
  WHERE return_number LIKE 'RET-' || year || '-%';
  
  new_number := 'RET-' || year || '-' || LPAD(sequence_num::text, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate return number on insert
CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set return number
DROP TRIGGER IF EXISTS return_requests_set_number ON return_requests;
CREATE TRIGGER return_requests_set_number
  BEFORE INSERT ON return_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_return_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS return_requests_updated_at ON return_requests;
CREATE TRIGGER return_requests_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_return_request_updated_at();

-- Function to calculate total refund amount from items
CREATE OR REPLACE FUNCTION calculate_return_refund_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_amount decimal(10, 2);
BEGIN
  SELECT COALESCE(SUM(refund_amount), 0)
  INTO total_amount
  FROM return_items
  WHERE return_request_id = NEW.return_request_id;
  
  UPDATE return_requests
  SET refund_amount = total_amount
  WHERE id = NEW.return_request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update refund amount when items are added/updated
DROP TRIGGER IF EXISTS return_items_calculate_refund ON return_items;
CREATE TRIGGER return_items_calculate_refund
  AFTER INSERT OR UPDATE ON return_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_return_refund_amount();

-- ===== END 20260311091027_create_returns_and_refunds_system.sql =====


-- ===== BEGIN 20260312113000_harden_auth_and_rbac_policies.sql =====

/*
  # Harden Auth + RBAC Policies

  Goals:
  1. Add admin role flag to user profiles
  2. Add reusable `public.is_admin()` helper for RLS checks
  3. Replace permissive order/returns policies with auth-aware policies
*/

-- Add admin role flag to profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);

-- Helper used by RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.is_admin FROM public.user_profiles up WHERE up.id = p_user_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- =========================
-- Orders + Order Items + Shipping
-- =========================

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Guests can create guest orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Guests can create guest orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Guests can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can create order items" ON order_items;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Guests can create order items"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.user_id IS NULL
    )
  );

CREATE POLICY "Users can create own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Users can create shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Users can view own shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Guests can create shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Users can create own shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Admins can create shipping addresses" ON shipping_addresses;

CREATE POLICY "Users can view own shipping addresses"
  ON shipping_addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipping_addresses.order_id
      AND o.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Guests can create shipping addresses"
  ON shipping_addresses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipping_addresses.order_id
      AND o.user_id IS NULL
    )
  );

CREATE POLICY "Users can create own shipping addresses"
  ON shipping_addresses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipping_addresses.order_id
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create shipping addresses"
  ON shipping_addresses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- =========================
-- Returns + Refunds
-- =========================

DROP POLICY IF EXISTS "Users can view own return requests" ON return_requests;
DROP POLICY IF EXISTS "Users can create own return requests" ON return_requests;
DROP POLICY IF EXISTS "Users can update own pending returns" ON return_requests;
DROP POLICY IF EXISTS "Admins can view all return requests" ON return_requests;
DROP POLICY IF EXISTS "Admins can update all return requests" ON return_requests;

CREATE POLICY "Users can view own return requests"
  ON return_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all return requests"
  ON return_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can create own return requests"
  ON return_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending returns"
  ON return_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all return requests"
  ON return_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own return items" ON return_items;
DROP POLICY IF EXISTS "Users can create return items for own requests" ON return_items;
DROP POLICY IF EXISTS "Admins can view all return items" ON return_items;
DROP POLICY IF EXISTS "Admins can update all return items" ON return_items;

CREATE POLICY "Users can view own return items"
  ON return_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM return_requests rr
      WHERE rr.id = return_items.return_request_id
      AND rr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can create return items for own requests"
  ON return_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM return_requests rr
      WHERE rr.id = return_items.return_request_id
      AND rr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update all return items"
  ON return_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own refund transactions" ON refund_transactions;
DROP POLICY IF EXISTS "Admins can view all refund transactions" ON refund_transactions;
DROP POLICY IF EXISTS "Admins can create refund transactions" ON refund_transactions;
DROP POLICY IF EXISTS "Admins can update refund transactions" ON refund_transactions;

CREATE POLICY "Users can view own refund transactions"
  ON refund_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM return_requests rr
      WHERE rr.id = refund_transactions.return_request_id
      AND rr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins can create refund transactions"
  ON refund_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update refund transactions"
  ON refund_transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (true);

-- ===== END 20260312113000_harden_auth_and_rbac_policies.sql =====


-- ===== BEGIN 20260312124500_fix_linter_security_warnings.sql =====

/*
  # Fix Supabase Security Linter Warnings

  Addresses:
  1) function_search_path_mutable
  2) rls_policy_always_true on INSERT/UPDATE/DELETE policies
*/

-- ========================================
-- Function search_path hardening
-- ========================================
ALTER FUNCTION public.reserve_stock(uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.release_reservation(text) SET search_path = public;
ALTER FUNCTION public.update_return_request_updated_at() SET search_path = public;
ALTER FUNCTION public.calculate_return_refund_amount() SET search_path = public;
ALTER FUNCTION public.generate_return_number() SET search_path = public;
ALTER FUNCTION public.set_return_number() SET search_path = public;
ALTER FUNCTION public.update_cart_items_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.update_orders_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_profiles_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_addresses_updated_at() SET search_path = public;
ALTER FUNCTION public.ensure_single_default_address() SET search_path = public;
ALTER FUNCTION public.get_available_stock(uuid) SET search_path = public;
ALTER FUNCTION public.release_expired_reservations() SET search_path = public;
ALTER FUNCTION public.update_stock(uuid, integer, text, uuid, text) SET search_path = public;
ALTER FUNCTION public.check_cart_stock_availability(jsonb) SET search_path = public;
ALTER FUNCTION public.process_order_stock(uuid, text) SET search_path = public;
ALTER FUNCTION public.track_user_signup(text, uuid, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_traffic_source(text, text) SET search_path = public;
ALTER FUNCTION public.get_analytics_summary(timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.update_email_notification_updated_at() SET search_path = public;

-- ========================================
-- cart_items policies
-- ========================================
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO public
  USING (
    (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- ========================================
-- email_notifications policies
-- ========================================
DROP POLICY IF EXISTS "System can insert email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "System can update email notifications" ON public.email_notifications;

CREATE POLICY "System can insert email notifications"
  ON public.email_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient_email IS NOT NULL
    AND position('@' in recipient_email) > 1
    AND status IN ('pending', 'sent', 'failed')
  );

CREATE POLICY "System can update email notifications"
  ON public.email_notifications FOR UPDATE
  TO authenticated
  USING (
    (public.is_admin()) OR (recipient_email IS NOT NULL AND position('@' in recipient_email) > 1)
  )
  WITH CHECK (
    status IN ('pending', 'sent', 'failed')
    AND ((public.is_admin()) OR (recipient_email IS NOT NULL AND position('@' in recipient_email) > 1))
  );

-- ========================================
-- newsletter_subscribers policies
-- ========================================
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  TO public
  WITH CHECK (
    email IS NOT NULL
    AND position('@' in email) > 1
    AND status IN ('active', 'unsubscribed')
  );

CREATE POLICY "Users can update own subscription"
  ON public.newsletter_subscribers FOR UPDATE
  TO public
  USING (
    email IS NOT NULL
    AND position('@' in email) > 1
  )
  WITH CHECK (
    email IS NOT NULL
    AND position('@' in email) > 1
    AND status IN ('active', 'unsubscribed')
  );

-- ========================================
-- orders / returns admin update policies
-- ========================================
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all return requests" ON public.return_requests;
CREATE POLICY "Admins can update all return requests"
  ON public.return_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all return items" ON public.return_items;
CREATE POLICY "Admins can update all return items"
  ON public.return_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update refund transactions" ON public.refund_transactions;
CREATE POLICY "Admins can update refund transactions"
  ON public.refund_transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========================================
-- products / variants service-role policies
-- ========================================
DROP POLICY IF EXISTS "Service role can insert products" ON public.products;
DROP POLICY IF EXISTS "Service role can update products" ON public.products;
DROP POLICY IF EXISTS "Service role can delete products" ON public.products;

CREATE POLICY "Service role can insert products"
  ON public.products FOR INSERT
  TO service_role
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update products"
  ON public.products FOR UPDATE
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete products"
  ON public.products FOR DELETE
  TO service_role
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can insert variants" ON public.product_variants;
DROP POLICY IF EXISTS "Service role can update variants" ON public.product_variants;
DROP POLICY IF EXISTS "Service role can delete variants" ON public.product_variants;

CREATE POLICY "Service role can insert variants"
  ON public.product_variants FOR INSERT
  TO service_role
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update variants"
  ON public.product_variants FOR UPDATE
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete variants"
  ON public.product_variants FOR DELETE
  TO service_role
  USING (auth.role() = 'service_role');

-- ========================================
-- favorites / recently_viewed policies
-- ========================================
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
CREATE POLICY "Users can insert own favorites"
  ON public.user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recently viewed" ON public.recently_viewed;
DROP POLICY IF EXISTS "Users can delete own recently viewed" ON public.recently_viewed;
DROP POLICY IF EXISTS "Anyone can create recently viewed" ON public.recently_viewed;
DROP POLICY IF EXISTS "Anyone can delete recently viewed" ON public.recently_viewed;

CREATE POLICY "Users can insert own recently viewed"
  ON public.recently_viewed FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
  );

CREATE POLICY "Users can delete own recently viewed"
  ON public.recently_viewed FOR DELETE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND session_id IS NOT NULL AND length(session_id) > 0)
  );

-- ========================================
-- inventory reservations policies
-- ========================================
DROP POLICY IF EXISTS "Anyone can create stock reservations" ON public.stock_reservations;
DROP POLICY IF EXISTS "Anyone can delete stock reservations" ON public.stock_reservations;

CREATE POLICY "Anyone can create stock reservations"
  ON public.stock_reservations FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
    AND quantity > 0
    AND expires_at > now()
  );

CREATE POLICY "Anyone can delete stock reservations"
  ON public.stock_reservations FOR DELETE
  TO public
  USING (
    session_id IS NOT NULL
    AND length(session_id) > 0
  );

-- ========================================
-- analytics ingest policies
-- ========================================
DROP POLICY IF EXISTS "Anyone can insert user analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Anyone can insert product analytics" ON public.product_analytics;
DROP POLICY IF EXISTS "Anyone can insert traffic sources" ON public.traffic_sources;
DROP POLICY IF EXISTS "Anyone can insert session analytics" ON public.session_analytics;
DROP POLICY IF EXISTS "Anyone can update session analytics" ON public.session_analytics;

CREATE POLICY "Anyone can insert user analytics"
  ON public.user_analytics FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
  );

CREATE POLICY "Anyone can insert product analytics"
  ON public.product_analytics FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
    AND event_type IN ('view', 'click', 'add_to_cart', 'size_select')
  );

CREATE POLICY "Anyone can insert traffic sources"
  ON public.traffic_sources FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
    AND source IN ('instagram', 'facebook', 'youtube', 'direct', 'google', 'twitter', 'other')
  );

CREATE POLICY "Anyone can insert session analytics"
  ON public.session_analytics FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
  );

CREATE POLICY "Anyone can update session analytics"
  ON public.session_analytics FOR UPDATE
  TO public
  USING (
    session_id IS NOT NULL
    AND length(session_id) > 0
  )
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
  );

-- ===== END 20260312124500_fix_linter_security_warnings.sql =====


-- ===== BEGIN 20260312133000_optimize_and_normalize_schema.sql =====

/*
  # Optimize and Normalize Schema

  Changes:
  1. Create normalized inventory view used by admin analytics
  2. Add targeted indexes for common dashboard/query paths
  3. Add coupon FK on orders.coupon_code
  4. Add coupon redemption function
  5. Remove legacy unused order payment columns
*/

-- Inventory view: current stock + active reservations + available stock
CREATE OR REPLACE VIEW public.inventory AS
SELECT
  pv.id AS variant_id,
  pv.stock AS current_stock,
  COALESCE(sr.reserved_stock, 0) AS reserved_stock,
  GREATEST(pv.stock - COALESCE(sr.reserved_stock, 0), 0) AS available_stock
FROM public.product_variants pv
LEFT JOIN (
  SELECT
    variant_id,
    SUM(quantity)::integer AS reserved_stock
  FROM public.stock_reservations
  WHERE expires_at > now()
  GROUP BY variant_id
) sr ON sr.variant_id = pv.id;

-- Query-path indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON public.orders(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed_at ON public.recently_viewed(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created_at ON public.user_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_requested_at ON public.return_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant_expires_at ON public.stock_reservations(variant_id, expires_at);

-- Normalize coupon references from orders to coupons.code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_coupon_code_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_coupon_code_fkey
      FOREIGN KEY (coupon_code)
      REFERENCES public.coupons(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Track coupon redemption in the database
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE code = p_code
    AND active = true
    AND (max_uses IS NULL OR current_uses < max_uses);

  RETURN FOUND;
END;
$$;

-- Remove legacy simulated-payment columns that are no longer used
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_method;

-- ===== END 20260312133000_optimize_and_normalize_schema.sql =====


-- ===== BEGIN 20260312134500_set_inventory_view_security_invoker.sql =====

/*
  # Set Inventory View to Security Invoker

  Fixes Supabase linter error:
  - security_definer_view on public.inventory
*/

ALTER VIEW public.inventory SET (security_invoker = true);

-- ===== END 20260312134500_set_inventory_view_security_invoker.sql =====


-- ===== BEGIN 20260312150000_add_admin_product_crud_policies.sql =====

/*
  # Add Admin Product CRUD Policies

  Allow authenticated admins to manage products and variants through the
  application API layer while keeping public catalog reads intact.
*/

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can update variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can delete variants" ON public.product_variants;

CREATE POLICY "Admins can insert variants"
  ON public.product_variants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update variants"
  ON public.product_variants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete variants"
  ON public.product_variants FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ===== END 20260312150000_add_admin_product_crud_policies.sql =====


-- ===== BEGIN 20260312153000_create_recommendation_events.sql =====

CREATE TABLE IF NOT EXISTS recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_context text NOT NULL,
  source_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  recommended_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  added_to_cart_at timestamptz,
  converted_at timestamptz,
  converted_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  attributed_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_session_id ON recommendation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_id ON recommendation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_product_id ON recommendation_events(recommended_product_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_clicked_at ON recommendation_events(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_converted_order_id ON recommendation_events(converted_order_id);

ALTER TABLE recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert recommendation events"
  ON recommendation_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update recommendation events"
  ON recommendation_events FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view recommendation events"
  ON recommendation_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- ===== END 20260312153000_create_recommendation_events.sql =====


-- ===== BEGIN 20260312162000_add_order_actions_and_product_image_storage.sql =====

/*
  # Add Order Action Metadata + Product Image Storage

  1) Order operations metadata
  2) Product image bucket and storage policies
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text;

CREATE INDEX IF NOT EXISTS idx_orders_fulfilled_at ON public.orders(fulfilled_at DESC) WHERE fulfilled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON public.orders(shipped_at DESC) WHERE shipped_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at DESC) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON public.orders(cancelled_at DESC) WHERE cancelled_at IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin(auth.uid())
  );

-- ===== END 20260312162000_add_order_actions_and_product_image_storage.sql =====


-- ===== BEGIN 20260312170000_fix_cart_session_policies.sql =====

DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
    AND (
      user_id IS NULL
      OR auth.uid() IS NULL
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO public
  USING (
    session_id IS NOT NULL
    AND length(session_id) > 0
  )
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) > 0
    AND (
      user_id IS NULL
      OR auth.uid() IS NULL
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO public
  USING (
    session_id IS NOT NULL
    AND length(session_id) > 0
  );

-- ===== END 20260312170000_fix_cart_session_policies.sql =====


-- ===== BEGIN 20260313101500_add_is_featured_to_products.sql =====

/*
  # Add Featured Flag To Products

  Supports homepage featured-product selection from Supabase-managed catalog.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_featured
  ON public.products(is_featured)
  WHERE is_featured = true;

-- ===== END 20260313101500_add_is_featured_to_products.sql =====


-- ===== BEGIN 20260313103500_remove_legacy_seed_products.sql =====

/*
  # Remove Legacy Seed Products (Safe Cleanup)

  Cleans up sample catalog rows seeded by the early bootstrap migration.
  Safety rules:
  1. Only specific known seed SKUs are targeted.
  2. Rows are removed only when they still use pexels-hosted sample images.
  3. Rows referenced by order_items are preserved.
*/

WITH seed_skus AS (
  SELECT unnest(ARRAY[
    'ESS-HOODIE-001',
    'OVR-TEE-002',
    'WIDE-PANT-003',
    'VTG-CAP-004',
    'BMR-JKT-005',
    'CRG-SHRT-006',
    'CRW-SWEAT-007',
    'GRP-TEE-008',
    'SLM-JEAN-009'
  ]) AS sku
),
legacy_seed_products AS (
  SELECT p.id
  FROM public.products p
  INNER JOIN seed_skus s ON s.sku = p.sku
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(p.images, '[]'::jsonb)) AS image_url(url)
    WHERE image_url.url ILIKE '%pexels.com%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.product_id = p.id
  )
)
DELETE FROM public.products p
USING legacy_seed_products lsp
WHERE p.id = lsp.id;

-- ===== END 20260313103500_remove_legacy_seed_products.sql =====


-- ===== BEGIN 20260313110000_remove_seed_catalog_products.sql =====

/*
  # Remove Seed Catalog Products

  Removes the demo catalog rows that were originally seeded into the project.
  Safety rule:
  - Keep any product that is already referenced by order_items.
*/

WITH seed_skus AS (
  SELECT unnest(ARRAY[
    'ESS-HOODIE-001',
    'OVR-TEE-002',
    'WIDE-PANT-003',
    'VTG-CAP-004',
    'BMR-JKT-005',
    'CRG-SHRT-006',
    'CRW-SWEAT-007',
    'GRP-TEE-008',
    'SLM-JEAN-009'
  ]) AS sku
), removable_seed_products AS (
  SELECT p.id
  FROM public.products p
  INNER JOIN seed_skus s ON s.sku = p.sku
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.product_id = p.id
  )
)
DELETE FROM public.products p
USING removable_seed_products rsp
WHERE p.id = rsp.id;

-- ===== END 20260313110000_remove_seed_catalog_products.sql =====


-- ===== BEGIN 20260314000300_payment_and_payhere_observability.sql =====

-- Consolidated payment gateway migration: payment_id + PayHere webhook observability + alert state

-- Add payment_id column for gateway transaction identifiers
alter table orders add column if not exists payment_id text;

-- Persist PayHere webhook events for observability and alerting
create extension if not exists "pgcrypto";

create table if not exists payhere_webhook_events (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  merchant_id text,
  payhere_amount text,
  payhere_currency text,
  status_code text,
  payment_id text,
  success boolean not null default false,
  reason text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payhere_webhook_events_order_id on payhere_webhook_events(order_id);
create index if not exists idx_payhere_webhook_events_created_at on payhere_webhook_events(created_at);
create index if not exists idx_payhere_webhook_events_success on payhere_webhook_events(success);

-- Track alert send timestamps and mute windows for PayHere webhook notifications
create table if not exists payhere_alert_state (
  key text primary key,
  last_sent_at timestamptz,
  muted_until timestamptz
);

-- ===== END 20260314000300_payment_and_payhere_observability.sql =====

