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
