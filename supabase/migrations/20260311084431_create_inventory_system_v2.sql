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