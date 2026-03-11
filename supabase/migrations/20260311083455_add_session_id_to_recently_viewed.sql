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