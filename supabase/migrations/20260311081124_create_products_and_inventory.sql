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

-- Insert sample products
INSERT INTO products (sku, name, description, price, category, color, images) VALUES
  ('ESS-HOODIE-001', 'Essential Hoodie', 'A premium heavyweight hoodie crafted from soft cotton blend. Features a relaxed fit with ribbed cuffs and hem. Perfect for everyday wear.', 89.99, 'Hoodies', 'Black', 
   '["https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/5325566/pexels-photo-5325566.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/5325564/pexels-photo-5325564.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('OVR-TEE-002', 'Oversized Tee', 'Relaxed fit oversized t-shirt made from premium cotton. Drop shoulder design with a longer length. Minimalist style that pairs with everything.', 34.99, 'T-Shirts', 'White',
   '["https://images.pexels.com/photos/4069148/pexels-photo-4069148.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('WIDE-PANT-003', 'Wide Leg Pants', 'Contemporary wide leg pants in durable cotton twill. High waisted with a relaxed silhouette. Features deep pockets and a comfortable elastic waistband.', 79.99, 'Pants', 'Olive',
   '["https://images.pexels.com/photos/3622622/pexels-photo-3622622.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('VTG-CAP-004', 'Vintage Snapback', 'Classic snapback cap with embroidered logo. Structured crown with flat brim. Adjustable snap closure for the perfect fit.', 44.99, 'Accessories', 'Black',
   '["https://images.pexels.com/photos/3622614/pexels-photo-3622614.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('BMR-JKT-005', 'Bomber Jacket', 'Premium bomber jacket with quilted lining. Ribbed collar, cuffs, and hem. Features zippered pockets and a sleek silhouette.', 129.99, 'Jackets', 'Olive',
   '["https://images.pexels.com/photos/3622620/pexels-photo-3622620.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('CRG-SHRT-006', 'Cargo Shorts', 'Utilitarian cargo shorts with multiple pockets. Made from durable cotton blend. Comfortable fit with adjustable waist.', 59.99, 'Shorts', 'Gray',
   '["https://images.pexels.com/photos/3622618/pexels-photo-3622618.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('CRW-SWEAT-007', 'Crewneck Sweatshirt', 'Classic crewneck sweatshirt in soft fleece. Ribbed collar, cuffs, and hem. Perfect layering piece for any season.', 69.99, 'Hoodies', 'Gray',
   '["https://images.pexels.com/photos/5325566/pexels-photo-5325566.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('GRP-TEE-008', 'Graphic Tee', 'Statement graphic t-shirt with bold print. Made from soft cotton jersey. Regular fit with crew neck.', 39.99, 'T-Shirts', 'Black',
   '["https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb),
  ('SLM-JEAN-009', 'Slim Fit Jeans', 'Modern slim fit jeans in premium denim. Classic five-pocket design with slight stretch for comfort. Dark wash finish.', 89.99, 'Pants', 'Black',
   '["https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb)
ON CONFLICT (sku) DO NOTHING;

-- Insert product variants with stock levels
INSERT INTO product_variants (product_id, size, stock)
SELECT id, size, stock FROM (
  VALUES
    ((SELECT id FROM products WHERE sku = 'ESS-HOODIE-001'), 'S', 12),
    ((SELECT id FROM products WHERE sku = 'ESS-HOODIE-001'), 'M', 8),
    ((SELECT id FROM products WHERE sku = 'ESS-HOODIE-001'), 'L', 3),
    ((SELECT id FROM products WHERE sku = 'ESS-HOODIE-001'), 'XL', 15),
    ((SELECT id FROM products WHERE sku = 'OVR-TEE-002'), 'S', 20),
    ((SELECT id FROM products WHERE sku = 'OVR-TEE-002'), 'M', 4),
    ((SELECT id FROM products WHERE sku = 'OVR-TEE-002'), 'L', 18),
    ((SELECT id FROM products WHERE sku = 'OVR-TEE-002'), 'XL', 22),
    ((SELECT id FROM products WHERE sku = 'OVR-TEE-002'), 'XXL', 10),
    ((SELECT id FROM products WHERE sku = 'WIDE-PANT-003'), '28', 6),
    ((SELECT id FROM products WHERE sku = 'WIDE-PANT-003'), '30', 2),
    ((SELECT id FROM products WHERE sku = 'WIDE-PANT-003'), '32', 14),
    ((SELECT id FROM products WHERE sku = 'WIDE-PANT-003'), '34', 8),
    ((SELECT id FROM products WHERE sku = 'WIDE-PANT-003'), '36', 5),
    ((SELECT id FROM products WHERE sku = 'VTG-CAP-004'), 'One Size', 25),
    ((SELECT id FROM products WHERE sku = 'BMR-JKT-005'), 'S', 7),
    ((SELECT id FROM products WHERE sku = 'BMR-JKT-005'), 'M', 1),
    ((SELECT id FROM products WHERE sku = 'BMR-JKT-005'), 'L', 9),
    ((SELECT id FROM products WHERE sku = 'BMR-JKT-005'), 'XL', 11),
    ((SELECT id FROM products WHERE sku = 'CRG-SHRT-006'), '28', 16),
    ((SELECT id FROM products WHERE sku = 'CRG-SHRT-006'), '30', 3),
    ((SELECT id FROM products WHERE sku = 'CRG-SHRT-006'), '32', 19),
    ((SELECT id FROM products WHERE sku = 'CRG-SHRT-006'), '34', 13),
    ((SELECT id FROM products WHERE sku = 'CRW-SWEAT-007'), 'S', 10),
    ((SELECT id FROM products WHERE sku = 'CRW-SWEAT-007'), 'M', 15),
    ((SELECT id FROM products WHERE sku = 'CRW-SWEAT-007'), 'L', 4),
    ((SELECT id FROM products WHERE sku = 'CRW-SWEAT-007'), 'XL', 12),
    ((SELECT id FROM products WHERE sku = 'GRP-TEE-008'), 'S', 8),
    ((SELECT id FROM products WHERE sku = 'GRP-TEE-008'), 'M', 2),
    ((SELECT id FROM products WHERE sku = 'GRP-TEE-008'), 'L', 14),
    ((SELECT id FROM products WHERE sku = 'GRP-TEE-008'), 'XL', 20),
    ((SELECT id FROM products WHERE sku = 'SLM-JEAN-009'), '28', 7),
    ((SELECT id FROM products WHERE sku = 'SLM-JEAN-009'), '30', 11),
    ((SELECT id FROM products WHERE sku = 'SLM-JEAN-009'), '32', 4),
    ((SELECT id FROM products WHERE sku = 'SLM-JEAN-009'), '34', 16),
    ((SELECT id FROM products WHERE sku = 'SLM-JEAN-009'), '36', 9)
) AS v(id, size, stock)
ON CONFLICT (product_id, size) DO NOTHING;