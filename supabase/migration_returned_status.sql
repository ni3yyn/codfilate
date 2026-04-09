-- Add 'returned' status to order_status enum
-- NOTE: In Postgres, you cannot easily drop enum values, but adding them is safe.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';

-- Automatic Stock Management RPCs
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE products 
  SET stock = GREATEST(stock - qty, 0)
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION increment_stock(p_id UUID, qty INT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE products 
  SET stock = stock + qty
  WHERE id = p_id;
$$;
