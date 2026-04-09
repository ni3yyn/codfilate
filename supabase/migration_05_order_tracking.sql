-- ============================================
-- Order Tracking & Status History
-- Automatically logs status changes and provides public access
-- ============================================

-- Table: Status History
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status order_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Trigger Function: Automatic Status Logging
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the status actually changed
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On orders table
DROP TRIGGER IF EXISTS trg_order_status_change ON orders;
CREATE TRIGGER trg_order_status_change
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION handle_order_status_change();

-- Initialize history for existing orders
INSERT INTO order_status_history (order_id, status, created_at)
SELECT id, status, created_at FROM orders
ON CONFLICT DO NOTHING;

-- RPC: Secure Public Order Tracking
-- Returns order info, items, and history if phone matches
CREATE OR REPLACE FUNCTION get_public_order_tracking(
  p_search_term TEXT -- Can be Order ID, Tracking ID, or Phone Number
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_record RECORD;
  v_items JSONB;
  v_history JSONB;
  v_rm_phone TEXT;
BEGIN
  -- 1. Resolve Order ID from search term
  -- Check if it's a UUID (Order ID)
  IF p_search_term ~ '^[0-9a-fA-F-]{36}$' THEN
    v_order_id := p_search_term::UUID;
  ELSE
    -- Search by Tracking ID or Phone Number
    SELECT id INTO v_order_id FROM orders 
    WHERE (tracking_id = p_search_term OR customer_phone = p_search_term)
    LIMIT 1;
  END IF;

  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Fetch Order Data
  SELECT 
    o.*, 
    s.name as store_name, 
    s.logo_url as store_logo,
    s.primary_color as store_primary_color
  INTO v_order_record
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  WHERE o.id = v_order_id;

  -- 3. Fetch Items
  SELECT jsonb_agg(items) INTO v_items 
  FROM (
    SELECT product_name, quantity, unit_price 
    FROM order_items 
    WHERE order_id = v_order_id
  ) items;

  -- 4. Fetch History
  SELECT jsonb_agg(h) INTO v_history
  FROM (
    SELECT status, created_at 
    FROM order_status_history 
    WHERE order_id = v_order_id
    ORDER BY created_at DESC
  ) h;

  -- 5. Fetch Regional Manager Phone for Support
  SELECT p.phone INTO v_rm_phone
  FROM profiles p
  WHERE p.role = 'regional_manager'::user_role
    AND (
      p.wilaya_id::text = v_order_record.wilaya 
      OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(v_order_record.wilaya))
    )
  LIMIT 1;

  -- 6. Combine and Return (excluding sensitive internal fields)
  RETURN jsonb_build_object(
    'id', v_order_record.id,
    'tracking_id', v_order_record.tracking_id,
    'status', v_order_record.status,
    'customer_name', v_order_record.customer_name,
    'total', v_order_record.total,
    'store_name', v_order_record.store_name,
    'store_logo', v_order_record.store_logo,
    'store_primary_color', v_order_record.store_primary_color,
    'items', v_items,
    'history', v_history,
    'rm_phone', v_rm_phone
  );
END;
$$;

-- Grant access to anonymuos users
GRANT EXECUTE ON FUNCTION get_public_order_tracking(TEXT) TO anon, authenticated;
