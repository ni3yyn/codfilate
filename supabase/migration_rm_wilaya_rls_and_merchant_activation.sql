-- ============================================
-- Fix RM order visibility (wilaya_id + assigned_wilayas)
-- Add order_items SELECT for regional managers
-- Merchant store activation by RM (wilaya-scoped)
-- Run after migration_marketplace_workflow.sql
-- ============================================

-- 1) Stores: wilaya + RM activation timestamp
ALTER TABLE stores ADD COLUMN IF NOT EXISTS wilaya_id INT REFERENCES wilayas(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rm_activated_at TIMESTAMPTZ;

-- Existing merchants: treat as already approved (no disruption)
UPDATE stores SET rm_activated_at = COALESCE(rm_activated_at, now()) WHERE rm_activated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stores_wilaya_id ON stores(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_stores_rm_pending ON stores(wilaya_id, rm_activated_at) WHERE rm_activated_at IS NULL;

-- 2) Orders — RM policies (match assign_regional_manager trigger logic)
DROP POLICY IF EXISTS "Regional managers can view wilaya orders" ON orders;
CREATE POLICY "Regional managers can view wilaya orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND orders.wilaya_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.wilaya_id = orders.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(orders.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(orders.wilaya_id))
        )
    )
  );

DROP POLICY IF EXISTS "Regional managers can update wilaya orders" ON orders;
CREATE POLICY "Regional managers can update wilaya orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND wilaya_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.wilaya_id = orders.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(orders.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(orders.wilaya_id))
        )
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'::user_role
    AND wilaya_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.wilaya_id = wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(wilaya_id))
        )
    )
  );

-- 3) Order items — RM can read line items for orders in their wilaya
DROP POLICY IF EXISTS "Regional managers can view wilaya order items" ON order_items;
CREATE POLICY "Regional managers can view wilaya order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.wilaya_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
            AND (
              p.wilaya_id = o.wilaya_id
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id::text))
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id))
            )
        )
    )
  );

-- 4) Stores — RM sees merchants in their wilaya (pending + active)
DROP POLICY IF EXISTS "Regional managers can view stores in wilaya" ON stores;
CREATE POLICY "Regional managers can view stores in wilaya"
  ON stores FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND stores.wilaya_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.wilaya_id = stores.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(stores.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(stores.wilaya_id))
        )
    )
  );

-- 5) Activate merchant store (RM only, same wilaya)
CREATE OR REPLACE FUNCTION regional_manager_activate_store(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w INT;
BEGIN
  IF get_user_role() IS DISTINCT FROM 'regional_manager'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT wilaya_id INTO v_w FROM stores WHERE id = p_store_id;
  IF v_w IS NULL THEN
    RAISE EXCEPTION 'store has no wilaya';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND (
        p.wilaya_id = v_w
        OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(v_w::text))
        OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(v_w))
      )
  ) THEN
    RAISE EXCEPTION 'wilaya not assigned to this manager';
  END IF;

  UPDATE stores SET
    rm_activated_at = now(),
    is_active = true,
    updated_at = now()
  WHERE id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION regional_manager_activate_store(UUID) TO authenticated;

-- 6) Product catalog — only from RM-approved stores (affiliate/marketer/public)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND listing_status = 'published'
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = products.store_id
        AND s.rm_activated_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Anyone can view active products anon" ON products;
CREATE POLICY "Anyone can view active products anon"
  ON products FOR SELECT
  TO anon
  USING (
    is_active = true
    AND listing_status = 'published'
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = products.store_id
        AND s.rm_activated_at IS NOT NULL
    )
  );

-- 7) Harden create_order_from_campaign — require RM-approved store
CREATE OR REPLACE FUNCTION create_order_from_campaign(
  p_slug TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_wilaya_id INT,
  p_commune TEXT,
  p_customer_address TEXT DEFAULT '',
  p_notes TEXT DEFAULT '',
  p_delivery_type TEXT DEFAULT 'home'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign marketing_campaigns%ROWTYPE;
  v_product products%ROWTYPE;
  v_aff affiliates%ROWTYPE;
  v_delivery_fee NUMERIC;
  v_wilaya_name TEXT;
  v_home_fee INT;
  v_office_fee INT;
  v_order_id UUID;
  v_total NUMERIC;
  v_slug TEXT := lower(trim(p_slug));
BEGIN
  IF length(trim(COALESCE(p_customer_name, ''))) < 2
     OR length(trim(COALESCE(p_customer_phone, ''))) < 6
     OR length(trim(COALESCE(p_commune, ''))) < 1 THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  SELECT * INTO v_campaign
  FROM marketing_campaigns
  WHERE slug = v_slug AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id = v_campaign.product_id
    AND is_active = true
    AND listing_status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_available';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = v_product.store_id AND s.rm_activated_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'store_not_activated';
  END IF;

  SELECT * INTO v_aff FROM affiliates WHERE id = v_campaign.affiliate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_campaign';
  END IF;

  SELECT name, home_delivery_fee, office_delivery_fee
  INTO v_wilaya_name, v_home_fee, v_office_fee
  FROM wilayas
  WHERE id = p_wilaya_id AND COALESCE(is_active, true) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_wilaya';
  END IF;

  IF COALESCE(NULLIF(trim(p_delivery_type), ''), 'home') = 'office' THEN
    v_delivery_fee := COALESCE(v_office_fee, 0);
  ELSE
    v_delivery_fee := COALESCE(v_home_fee, 0);
  END IF;

  v_total := v_campaign.sale_price + COALESCE(v_delivery_fee, 0);

  INSERT INTO orders (
    store_id,
    affiliate_id,
    referral_code,
    customer_name,
    customer_phone,
    wilaya,
    wilaya_id,
    commune,
    customer_address,
    notes,
    total,
    base_price,
    sale_price,
    delivery_fee,
    delivery_type,
    status,
    tracking_status,
    marketing_campaign_id
  ) VALUES (
    v_product.store_id,
    v_aff.id,
    v_aff.referral_code,
    trim(p_customer_name),
    trim(p_customer_phone),
    v_wilaya_name,
    p_wilaya_id,
    trim(p_commune),
    COALESCE(p_customer_address, ''),
    COALESCE(p_notes, ''),
    v_total,
    v_product.price,
    v_campaign.sale_price,
    COALESCE(v_delivery_fee, 0),
    COALESCE(NULLIF(trim(p_delivery_type), ''), 'home'),
    'awaiting_marketer'::order_status,
    'pending',
    v_campaign.id
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (
    order_id,
    store_id,
    product_id,
    product_name,
    quantity,
    unit_price
  ) VALUES (
    v_order_id,
    v_product.store_id,
    v_product.id,
    v_product.name,
    1,
    v_product.price
  );

  RETURN v_order_id;
END;
$$;

-- 8) RM can update delivery_requests in their wilaya (assign drivers, status)
DROP POLICY IF EXISTS "Regional managers can update wilaya delivery requests" ON delivery_requests;
CREATE POLICY "Regional managers can update wilaya delivery requests"
  ON delivery_requests FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = delivery_requests.order_id
        AND o.wilaya_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
            AND (
              p.wilaya_id = o.wilaya_id
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id::text))
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id))
            )
        )
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = delivery_requests.order_id
        AND o.wilaya_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
            AND (
              p.wilaya_id = o.wilaya_id
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id::text))
              OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(o.wilaya_id))
            )
        )
    )
  );
