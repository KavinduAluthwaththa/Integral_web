-- Add product visibility, limited edition, and size chart support
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_limited_edition boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_chart_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index to quickly filter visible products
CREATE INDEX IF NOT EXISTS idx_products_is_hidden_false
  ON products(is_hidden)
  WHERE is_hidden = false;
