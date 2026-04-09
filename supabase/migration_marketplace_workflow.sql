-- ============================================
-- Marketplace workflow: RM product moderation,
-- marketing campaigns + public checkout,
-- marketer confirmation step, COD receipt flag
-- Run after migration_production_saas.sql
-- ============================================

-- 1) order_status: awaiting_marketer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_marketer'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'awaiting_marketer';
  END IF;
END $$;

-- 2) products: listing moderation
ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_status TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_note TEXT;

UPDATE products SET listing_status = 'published'
WHERE listing_status IS NULL;

ALTER TABLE products ALTER COLUMN listing_status SET DEFAULT 'pending_review';
ALTER TABLE products ALTER COLUMN listing_status SET NOT NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_listing_status_check;
ALTER TABLE products ADD CONSTRAINT products_listing_status_check
  CHECK (listing_status IN ('draft', 'pending_review', 'published', 'rejected'));

-- 3) orders: campaign + COD
ALTER TABLE orders ADD COLUMN IF NOT EXISTS marketing_campaign_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_confirmed_at TIMESTAMPTZ;

-- 4) marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price NUMERIC(10, 2) NOT NULL CHECK (sale_price >= 0),
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaigns_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_affiliate ON marketing_campaigns(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_product ON marketing_campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_store ON marketing_campaigns(store_id);

CREATE OR REPLACE FUNCTION trg_marketing_campaigns_normalize_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.store_id IS NULL THEN
    SELECT store_id INTO NEW.store_id FROM products WHERE id = NEW.product_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_campaigns_bi ON marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_bi
  BEFORE INSERT OR UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trg_marketing_campaigns_normalize_slug();

-- FK campaign on orders (after table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_marketing_campaign_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_marketing_campaign_id_fkey
      FOREIGN KEY (marketing_campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) RLS — products catalog (published only) + RM full read
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true AND listing_status = 'published');

DROP POLICY IF EXISTS "Anyone can view active products anon" ON products;
CREATE POLICY "Anyone can view active products anon"
  ON products FOR SELECT
  TO anon
  USING (is_active = true AND listing_status = 'published');

DROP POLICY IF EXISTS "regional_managers_select_products" ON products;
CREATE POLICY "regional_managers_select_products"
  ON products FOR SELECT
  TO authenticated
  USING (get_user_role() = 'regional_manager'::user_role);

-- 6) RLS — marketing_campaigns
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_affiliate_all" ON marketing_campaigns;
CREATE POLICY "campaigns_affiliate_all"
  ON marketing_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = marketing_campaigns.affiliate_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = marketing_campaigns.affiliate_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaigns_merchant_select" ON marketing_campaigns;
CREATE POLICY "campaigns_merchant_select"
  ON marketing_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = marketing_campaigns.store_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaigns_admin" ON marketing_campaigns;
CREATE POLICY "campaigns_admin"
  ON marketing_campaigns FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "campaigns_public_read" ON marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_public_read_authenticated" ON marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_select_active" ON marketing_campaigns;
CREATE POLICY "campaigns_select_active"
  ON marketing_campaigns FOR SELECT
  USING (is_active = true);

-- 7) Wilayas — anon read for public checkout
DROP POLICY IF EXISTS "anon can view active wilayas" ON wilayas;
CREATE POLICY "anon can view active wilayas"
  ON wilayas FOR SELECT
  TO anon
  USING (COALESCE(is_active, true) = true);

-- 8) Notify helpers (RM)
CREATE OR REPLACE FUNCTION notify_rms_for_wilaya_order(p_order_id UUID, p_wilaya_id INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_wilaya_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO notifications (user_id, title, body, deeplink)
  SELECT p.user_id,
    'طلب جديد',
    'تم استلام طلب في ولايتك',
    '/(regional_manager)/orders?highlight=' || p_order_id::text
  FROM profiles p
  WHERE p.role = 'regional_manager'::user_role
    AND (
      p.wilaya_id = p_wilaya_id
      OR p.assigned_wilayas @> to_jsonb(p_wilaya_id::text)
    );
END;
$$;

CREATE OR REPLACE FUNCTION notify_rms_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wilaya_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM 'awaiting_marketer'::order_status THEN
    PERFORM notify_rms_for_wilaya_order(NEW.id, NEW.wilaya_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_affiliate_order_needs_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'awaiting_marketer'::order_status AND NEW.affiliate_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, deeplink)
    SELECT a.user_id,
      'طلب يحتاج تأكيدك',
      'عميل قدّم طلباً عبر رابط الحملة. راجع التفاصيل ووافق لإرساله للمدير الإقليمي.',
      '/(affiliate)/orders?highlight=' || NEW.id::text
    FROM affiliates a
    WHERE a.id = NEW.affiliate_id AND a.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_affiliate_awaiting ON orders;
CREATE TRIGGER trg_notify_affiliate_awaiting
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_affiliate_order_needs_confirmation();

CREATE OR REPLACE FUNCTION notify_rms_after_marketer_confirmed_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'awaiting_marketer'::order_status
     AND NEW.status = 'pending'::order_status
     AND NEW.wilaya_id IS NOT NULL THEN
    PERFORM notify_rms_for_wilaya_order(NEW.id, NEW.wilaya_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rm_marketer_confirmed ON orders;
CREATE TRIGGER trg_notify_rm_marketer_confirmed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_rms_after_marketer_confirmed_order();

-- 9) RM product review RPC
CREATE OR REPLACE FUNCTION rm_review_product(
  p_product_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  IF get_user_role() IS DISTINCT FROM 'regional_manager'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_decision NOT IN ('published', 'rejected') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;

  UPDATE products SET
    listing_status = p_decision,
    rejection_note = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    updated_at = now()
  WHERE id = p_product_id
    AND listing_status = 'pending_review';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'product not in review queue';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rm_review_product(UUID, TEXT, TEXT) TO authenticated;

-- 10) Marketer confirms campaign order
CREATE OR REPLACE FUNCTION affiliate_confirm_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  UPDATE orders
  SET
    status = 'pending'::order_status,
    tracking_status = 'pending',
    updated_at = now()
  WHERE id = p_order_id
    AND status = 'awaiting_marketer'::order_status
    AND affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid());

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'not_found_or_forbidden';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION affiliate_confirm_order(UUID) TO authenticated;

-- 11) Public order creation (anonymous / no session)
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

GRANT EXECUTE ON FUNCTION create_order_from_campaign(TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_order_from_campaign(TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
