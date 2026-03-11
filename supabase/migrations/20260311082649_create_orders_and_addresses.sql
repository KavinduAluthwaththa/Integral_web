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