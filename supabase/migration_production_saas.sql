-- ============================================
-- Production SaaS — run after prior migrations
-- ============================================

-- --------------------------------------------
-- 1) platform_settings
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 200,
  admin_fee NUMERIC(10,2) NOT NULL DEFAULT 50,
  regional_manager_fee NUMERIC(10,2) NOT NULL DEFAULT 150,
  min_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 100,
  failed_delivery_compensation NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_read" ON platform_settings;
CREATE POLICY "platform_settings_read"
  ON platform_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "platform_settings_admin_write" ON platform_settings;
CREATE POLICY "platform_settings_admin_write"
  ON platform_settings FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');


-- --------------------------------------------
-- 2) wallet_ledger + apply_wallet_movement
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  ledger_type TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  balance_after NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON wallet_ledger(user_id, created_at DESC);

DROP INDEX IF EXISTS ux_wallet_ledger_idempotent;
CREATE UNIQUE INDEX ux_wallet_ledger_idempotent
  ON wallet_ledger(user_id, ledger_type, COALESCE(ref_type, ''), COALESCE(ref_id, ''));

CREATE OR REPLACE FUNCTION apply_wallet_movement(
  p_user_id UUID,
  p_amount NUMERIC,
  p_ledger_type TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_bal NUMERIC;
  v_exists UUID;
  v_earn_delta NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_amount = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_exists FROM wallet_ledger
  WHERE user_id = p_user_id
    AND ledger_type = p_ledger_type
    AND COALESCE(ref_type, '') = COALESCE(p_ref_type, '')
    AND COALESCE(ref_id, '') = COALESCE(p_ref_id, '')
  LIMIT 1;

  IF v_exists IS NOT NULL THEN
    RETURN v_exists;
  END IF;

  INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_bal FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  v_bal := COALESCE(v_bal, 0);

  IF p_amount < 0 AND v_bal + p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance for user %', p_user_id;
  END IF;

  v_bal := v_bal + p_amount;

  v_earn_delta := 0;
  IF p_ledger_type IN ('credit_settlement', 'credit_failed_delivery') AND p_amount > 0 THEN
    v_earn_delta := p_amount;
  ELSIF p_ledger_type = 'reversal' AND p_amount < 0 THEN
    v_earn_delta := p_amount;
  END IF;

  UPDATE wallets SET
    balance = v_bal,
    total_earned = GREATEST(0, total_earned + v_earn_delta),
    total_withdrawn = CASE
      WHEN p_ledger_type = 'debit_payout' AND p_amount < 0 THEN total_withdrawn + (-p_amount)
      ELSE total_withdrawn
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_ledger (user_id, amount, ledger_type, ref_type, ref_id, metadata, balance_after)
  VALUES (p_user_id, p_amount, p_ledger_type, p_ref_type, p_ref_id, p_meta, v_bal)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_ledger_select_own" ON wallet_ledger;
CREATE POLICY "wallet_ledger_select_own"
  ON wallet_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'admin');


-- --------------------------------------------
-- 3) settlements — allow reversed
-- --------------------------------------------
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_status_check;
ALTER TABLE settlements ADD CONSTRAINT settlements_status_check
  CHECK (status IN ('pending','settled','failed','reversed'));


-- --------------------------------------------
-- 4) product_wilaya_stock (before stock trigger)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS product_wilaya_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  wilaya_id INT NOT NULL REFERENCES wilayas(id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, wilaya_id)
);

CREATE INDEX IF NOT EXISTS idx_pws_wilaya ON product_wilaya_stock(wilaya_id);

ALTER TABLE product_wilaya_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pws_select" ON product_wilaya_stock;
DROP POLICY IF EXISTS "pws_merchant_write" ON product_wilaya_stock;
DROP POLICY IF EXISTS "pws_rm_write" ON product_wilaya_stock;
DROP POLICY IF EXISTS "pws_admin" ON product_wilaya_stock;
DROP POLICY IF EXISTS "Anyone can view regional stock" ON product_wilaya_stock;
DROP POLICY IF EXISTS "Merchants manage regional stock via store" ON product_wilaya_stock;
DROP POLICY IF EXISTS "Admins manage regional stock" ON product_wilaya_stock;
DROP POLICY IF EXISTS "Regional managers adjust regional stock" ON product_wilaya_stock;

CREATE POLICY "pws_select" ON product_wilaya_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "pws_merchant_write" ON product_wilaya_stock FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products pr JOIN stores st ON st.id = pr.store_id
      WHERE pr.id = product_wilaya_stock.product_id AND st.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products pr JOIN stores st ON st.id = pr.store_id
      WHERE pr.id = product_wilaya_stock.product_id AND st.owner_id = auth.uid()
    )
  );
CREATE POLICY "pws_rm_write" ON product_wilaya_stock FOR ALL TO authenticated
  USING (
    get_user_role() = 'regional_manager'
    AND EXISTS (
      SELECT 1 FROM profiles prf WHERE prf.user_id = auth.uid()
        AND (prf.wilaya_id = product_wilaya_stock.wilaya_id OR prf.assigned_wilayas @> to_jsonb(product_wilaya_stock.wilaya_id::text))
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'
    AND EXISTS (
      SELECT 1 FROM profiles prf WHERE prf.user_id = auth.uid()
        AND (prf.wilaya_id = product_wilaya_stock.wilaya_id OR prf.assigned_wilayas @> to_jsonb(product_wilaya_stock.wilaya_id::text))
    )
  );
CREATE POLICY "pws_admin" ON product_wilaya_stock FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');


-- --------------------------------------------
-- 5) Stock + reversal on orders
-- --------------------------------------------
CREATE OR REPLACE FUNCTION order_status_consumed(s TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(s, '') IN ('picked_up','in_transit','shipped','delivered');
$$;

CREATE OR REPLACE FUNCTION reverse_order_settlement(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  v_affiliate_user_id UUID;
  v_manager_user_id UUID;
  v_delivery_user_id UUID;
  v_oid TEXT;
  v_aid UUID;
BEGIN
  SELECT * INTO s FROM settlements WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR s.status <> 'settled' THEN
    RETURN;
  END IF;

  v_oid := p_order_id::text;

  IF s.marketer_commission > 0 THEN
    SELECT a.user_id, o.affiliate_id INTO v_affiliate_user_id, v_aid
    FROM orders o
    JOIN affiliates a ON a.id = o.affiliate_id
    WHERE o.id = p_order_id;
    IF v_affiliate_user_id IS NOT NULL THEN
      PERFORM apply_wallet_movement(
        v_affiliate_user_id, -s.marketer_commission, 'reversal',
        'order_reversal', v_oid || ':affiliate', '{}'::jsonb
      );
      UPDATE affiliates SET
        total_earnings = GREATEST(0, total_earnings - s.marketer_commission),
        total_conversions = GREATEST(0, total_conversions - 1)
      WHERE id = v_aid;
    END IF;
  END IF;

  IF s.regional_manager_commission > 0 THEN
    SELECT pr.user_id INTO v_manager_user_id FROM orders o
    JOIN profiles pr ON pr.id = o.regional_manager_id
    WHERE o.id = p_order_id;
    IF v_manager_user_id IS NOT NULL THEN
      PERFORM apply_wallet_movement(
        v_manager_user_id, -s.regional_manager_commission, 'reversal',
        'order_reversal', v_oid || ':rm', '{}'::jsonb
      );
    END IF;
  END IF;

  IF s.delivery_company_commission > 0 THEN
    SELECT pr.user_id INTO v_delivery_user_id
    FROM delivery_requests dr
    JOIN profiles pr ON pr.id = dr.delivery_company_id
    WHERE dr.order_id = p_order_id
    ORDER BY dr.updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_delivery_user_id IS NOT NULL THEN
      PERFORM apply_wallet_movement(
        v_delivery_user_id, -s.delivery_company_commission, 'reversal',
        'order_reversal', v_oid || ':delivery', '{}'::jsonb
      );
    END IF;
  END IF;

  UPDATE settlements SET status = 'reversed' WHERE order_id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_order_stock_from_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  v_w INT;
  v_row_exists BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_w := NEW.wilaya_id;

  IF NOT order_status_consumed(OLD.status::text) AND order_status_consumed(NEW.status::text) THEN
    FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
      CONTINUE WHEN item.product_id IS NULL;

      IF v_w IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM product_wilaya_stock
          WHERE product_id = item.product_id AND wilaya_id = v_w
        ) INTO v_row_exists;
      ELSE
        v_row_exists := FALSE;
      END IF;

      IF v_row_exists THEN
        UPDATE product_wilaya_stock SET
          quantity = GREATEST(0, quantity - item.quantity),
          updated_at = now()
        WHERE product_id = item.product_id AND wilaya_id = v_w;
      ELSE
        UPDATE products SET stock = GREATEST(0, stock - item.quantity) WHERE id = item.product_id;
      END IF;
    END LOOP;
  END IF;

  IF order_status_consumed(OLD.status::text) AND NOT order_status_consumed(NEW.status::text)
     AND NEW.status::text IN ('cancelled','returned','failed') THEN
    FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
      CONTINUE WHEN item.product_id IS NULL;

      IF v_w IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM product_wilaya_stock
          WHERE product_id = item.product_id AND wilaya_id = v_w
        ) INTO v_row_exists;
      ELSE
        v_row_exists := FALSE;
      END IF;

      IF v_row_exists THEN
        UPDATE product_wilaya_stock SET
          quantity = quantity + item.quantity,
          updated_at = now()
        WHERE product_id = item.product_id AND wilaya_id = v_w;
      ELSE
        UPDATE products SET stock = stock + item.quantity WHERE id = item.product_id;
      END IF;
    END LOOP;
  END IF;

  IF OLD.status::text = 'delivered' AND NEW.status::text = 'returned' THEN
    BEGIN
      PERFORM reverse_order_settlement(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF NEW.status::text = 'cancelled' AND OLD.status::text IS DISTINCT FROM 'cancelled' THEN
    UPDATE commissions SET status = 'rejected'
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock_status ON orders;
CREATE TRIGGER trg_orders_stock_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_stock_from_status();


-- --------------------------------------------
-- 6) payout_requests columns + RLS
-- --------------------------------------------
ALTER TABLE payout_requests ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE payout_requests ALTER COLUMN affiliate_id DROP NOT NULL;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS requester_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS payout_proof_url TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS external_ref TEXT;

UPDATE payout_requests pr
SET requester_user_id = a.user_id
FROM affiliates a
WHERE pr.requester_user_id IS NULL
  AND pr.affiliate_id IS NOT NULL
  AND pr.affiliate_id = a.id;

UPDATE payout_requests pr
SET requester_user_id = p.user_id
FROM stores s
JOIN profiles p ON p.user_id = s.owner_id AND p.role = 'merchant'
WHERE pr.requester_user_id IS NULL
  AND pr.store_id IS NOT NULL
  AND pr.store_id = s.id;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Affiliates can manage own payouts" ON payout_requests;
DROP POLICY IF EXISTS "Merchants can view store payouts" ON payout_requests;
DROP POLICY IF EXISTS "Merchants can update store payouts" ON payout_requests;
DROP POLICY IF EXISTS "Admins can manage all payouts" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_select" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_insert" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_update_merchant" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_update_rm" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_admin_all" ON payout_requests;

CREATE POLICY "payout_requests_select"
  ON payout_requests FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    OR requester_user_id = auth.uid()
    OR (store_id IS NOT NULL AND store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
    OR (affiliate_id IS NOT NULL AND affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()))
    OR (
      get_user_role() = 'regional_manager'
      AND store_id IS NOT NULL
      AND store_id IN (
        SELECT s.id FROM stores s
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE p.role = 'regional_manager'
          AND (
            s.wilaya_id = p.wilaya_id
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
          )
      )
    )
  );

CREATE POLICY "payout_requests_insert"
  ON payout_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "payout_requests_update_merchant"
  ON payout_requests FOR UPDATE TO authenticated
  USING (
    store_id IS NOT NULL
    AND store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    store_id IS NOT NULL
    AND store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Regional managers can update (approve/reject) payout requests for stores in their wilayas
CREATE POLICY "payout_requests_update_rm"
  ON payout_requests FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'regional_manager'
    AND store_id IS NOT NULL
    AND store_id IN (
      SELECT s.id FROM stores s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE p.role = 'regional_manager'
        AND (
          s.wilaya_id = p.wilaya_id
          OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
        )
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'
    AND store_id IS NOT NULL
    AND store_id IN (
      SELECT s.id FROM stores s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE p.role = 'regional_manager'
        AND (
          s.wilaya_id = p.wilaya_id
          OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
        )
    )
  );

CREATE POLICY "payout_requests_admin_all"
  ON payout_requests FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');


-- --------------------------------------------
-- 7) Debit wallet when payout marked paid
-- --------------------------------------------
CREATE OR REPLACE FUNCTION handle_payout_paid_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'paid' AND (OLD.status IS NULL OR OLD.status::text IS DISTINCT FROM 'paid') THEN
    IF NEW.requester_user_id IS NULL THEN
      RAISE EXCEPTION 'requester_user_id is required for paid payouts';
    END IF;
    PERFORM apply_wallet_movement(
      NEW.requester_user_id,
      -NEW.amount,
      'debit_payout',
      'payout_request',
      NEW.id::text,
      jsonb_build_object('method', NEW.method)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_paid_wallet ON payout_requests;
CREATE TRIGGER trg_payout_paid_wallet
  AFTER UPDATE OF status ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_payout_paid_wallet();


-- --------------------------------------------
-- 8) Delivery settlement + failed compensation
-- --------------------------------------------
-- ============================================
-- SHARED SETTLEMENT FUNCTION (Fail-Safe)
-- ============================================
CREATE OR REPLACE FUNCTION process_order_delivered_settlement(p_order_id UUID, p_delivery_fee NUMERIC DEFAULT 0)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_marketer_profit NUMERIC;
  v_affiliate_user_id UUID;
  v_manager_user_id UUID;
  v_delivery_user_id UUID;
  v_merchant_user_id UUID;
  v_dr RECORD;
  v_pf NUMERIC;
  v_af NUMERIC;
  v_rm NUMERIC;
  v_oid TEXT;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF v_order IS NULL THEN RETURN; END IF;

    -- Avoid double-settling in the settlements table
    -- (We use the table as a 'truth' source for one-time calculation)
    IF EXISTS (SELECT 1 FROM settlements WHERE order_id = p_order_id AND status = 'settled') THEN
       -- Still, double-check wallets via apply_wallet_movement (it's idempotent)
    ELSE
        SELECT platform_fee, admin_fee, regional_manager_fee
        INTO v_pf, v_af, v_rm
        FROM platform_settings WHERE id = 1;

        v_pf := COALESCE(v_pf, 200);
        v_af := COALESCE(v_af, 50);
        v_rm := COALESCE(v_rm, 150);

        v_marketer_profit := COALESCE(v_order.sale_price, 0) - COALESCE(v_order.base_price, 0) - v_pf;
        IF v_marketer_profit < 0 THEN v_marketer_profit := 0; END IF;

        INSERT INTO settlements (
          order_id, store_id, merchant_amount, marketer_commission,
          regional_manager_commission, delivery_company_commission,
          platform_fee, admin_fee, total_customer_paid, settled_at, status
        ) VALUES (
          v_order.id, v_order.store_id, COALESCE(v_order.base_price, 0),
          v_marketer_profit, v_rm, p_delivery_fee, v_pf, v_af,
          COALESCE(v_order.sale_price, 0) + p_delivery_fee, now(), 'settled'
        )
        ON CONFLICT (order_id) DO UPDATE SET
          status = 'settled',
          settled_at = now();
    END IF;

    v_oid := p_order_id::text;

    -- 1. Merchant (Store Owner) - THE FIX
    SELECT owner_id INTO v_merchant_user_id FROM stores WHERE id = v_order.store_id;
    IF v_merchant_user_id IS NOT NULL AND COALESCE(v_order.base_price, 0) > 0 THEN
      PERFORM apply_wallet_movement(
        v_merchant_user_id, COALESCE(v_order.base_price, 0), 'credit_settlement',
        'order_delivered_merchant', v_oid, jsonb_build_object('role', 'merchant')
      );
    END IF;

    -- 2. Marketer (Affiliate)
    IF v_order.affiliate_id IS NOT NULL THEN
      SELECT user_id INTO v_affiliate_user_id FROM affiliates WHERE id = v_order.affiliate_id;
      -- We calculate profit based on current order prices to be safe
      SELECT platform_fee INTO v_pf FROM platform_settings WHERE id = 1;
      v_pf := COALESCE(v_pf, 200);
      v_marketer_profit := COALESCE(v_order.sale_price, 0) - COALESCE(v_order.base_price, 0) - v_pf;
      
      IF v_affiliate_user_id IS NOT NULL AND v_marketer_profit > 0 THEN
        PERFORM apply_wallet_movement(
          v_affiliate_user_id, v_marketer_profit, 'credit_settlement',
          'order_delivered', v_oid, jsonb_build_object('role', 'affiliate')
        );
        -- Update stats only if not already counted (this might double count if not careful, 
        -- better to move this to a purely idempotent trigger too)
      END IF;
    END IF;

    -- 3. Regional Manager
    IF v_order.regional_manager_id IS NOT NULL THEN
      SELECT user_id INTO v_manager_user_id FROM profiles WHERE id = v_order.regional_manager_id;
      SELECT regional_manager_fee INTO v_rm FROM platform_settings WHERE id = 1;
      v_rm := COALESCE(v_rm, 150);
      IF v_manager_user_id IS NOT NULL AND v_rm > 0 THEN
        PERFORM apply_wallet_movement(
          v_manager_user_id, v_rm, 'credit_settlement',
          'order_delivered_rm', v_oid, jsonb_build_object('role', 'regional_manager')
        );
      END IF;
    END IF;

    -- 4. Delivery Company
    SELECT delivery_company_id INTO v_delivery_user_id 
    FROM delivery_requests WHERE order_id = p_order_id AND status = 'delivered' LIMIT 1;
    
    IF v_delivery_user_id IS NOT NULL AND p_delivery_fee > 0 THEN
        -- Get the actual user_id from profile
        SELECT user_id INTO v_delivery_user_id FROM profiles WHERE id = v_delivery_user_id;
        IF v_delivery_user_id IS NOT NULL THEN
            PERFORM apply_wallet_movement(
              v_delivery_user_id, p_delivery_fee, 'credit_settlement',
              'order_delivered_delivery', v_oid, jsonb_build_object('role', 'delivery')
            );
        END IF;
    END IF;
END;
$$;

-- ---- UPDATED TRIGGER 1: Delivery Requests ----
CREATE OR REPLACE FUNCTION handle_delivery_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
    NEW.delivered_at = now();
    -- Update order status too
    UPDATE orders SET status = 'delivered', tracking_status = 'delivered' WHERE id = NEW.order_id;
    -- Run settlement
    PERFORM process_order_delivered_settlement(NEW.order_id, COALESCE(NEW.delivery_fee, 0));
  END IF;
  RETURN NEW;
END;
$$;

-- ---- NEW TRIGGER 2: Manual Order Updates ----
CREATE OR REPLACE FUNCTION handle_order_status_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fee NUMERIC;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
    -- Try to find delivery fee from request
    SELECT delivery_fee INTO v_fee FROM delivery_requests WHERE order_id = NEW.id LIMIT 1;
    PERFORM process_order_delivered_settlement(NEW.id, COALESCE(v_fee, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_settlement ON orders;
CREATE TRIGGER trg_order_settlement
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_settlement();

CREATE OR REPLACE FUNCTION handle_delivery_failed_compensation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp NUMERIC;
  v_delivery_user_id UUID;
BEGIN
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status <> 'failed') THEN
    SELECT failed_delivery_compensation INTO v_comp FROM platform_settings WHERE id = 1;
    v_comp := COALESCE(v_comp, 0);
    IF v_comp > 0 AND NEW.delivery_company_id IS NOT NULL THEN
      SELECT user_id INTO v_delivery_user_id FROM profiles WHERE id = NEW.delivery_company_id;
      IF v_delivery_user_id IS NOT NULL THEN
        PERFORM apply_wallet_movement(
          v_delivery_user_id, v_comp, 'credit_failed_delivery',
          'delivery_failed', NEW.id::text,
          jsonb_build_object('reason', NEW.failed_reason)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_failed_compensation ON delivery_requests;
CREATE TRIGGER trg_delivery_failed_compensation
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_delivery_failed_compensation();


-- --------------------------------------------
-- 9) notifications + push_tokens
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  deeplink TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_select"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_tokens_own" ON push_tokens;
CREATE POLICY "push_tokens_own"
  ON push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION notify_rms_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wilaya_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, deeplink)
    SELECT p.user_id,
      'طلب جديد',
      'تم استلام طلب في ولايتك',
      'codfilate://regional_manager/orders?highlight=' || NEW.id::text
    FROM profiles p
    WHERE p.role = 'regional_manager'::user_role
      AND (
        p.wilaya_id = NEW.wilaya_id
        OR p.assigned_wilayas @> to_jsonb(NEW.wilaya_id::text)
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rm_new_order ON orders;
CREATE TRIGGER trg_notify_rm_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_rms_new_order();

CREATE OR REPLACE FUNCTION notify_delivery_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.delivery_company_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.delivery_company_id IS DISTINCT FROM NEW.delivery_company_id) THEN
    SELECT user_id INTO v_uid FROM profiles WHERE id = NEW.delivery_company_id;
    IF v_uid IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, deeplink)
      VALUES (
        v_uid,
        'طلب توصيل',
        'تم تعيين طلب توصيل لك',
        'codfilate://delivery/deliveries?highlight=' || NEW.order_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_delivery_assigned ON delivery_requests;
CREATE TRIGGER trg_notify_delivery_assigned
  AFTER INSERT OR UPDATE OF delivery_company_id ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_delivery_assigned();

CREATE OR REPLACE FUNCTION notify_affiliate_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oid UUID;
  v_aff UUID;
  v_uid UUID;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
    v_oid := NEW.order_id;
    SELECT o.affiliate_id INTO v_aff FROM orders o WHERE o.id = v_oid;
    IF v_aff IS NOT NULL THEN
      SELECT user_id INTO v_uid FROM affiliates WHERE id = v_aff;
      IF v_uid IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, deeplink)
        VALUES (
          v_uid,
          'تم التوصيل',
          'تم توصيل طلب — تم إضافة الربح إلى محفظتك',
          'codfilate://affiliate/order/' || v_oid::text
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_affiliate_delivered ON delivery_requests;
CREATE TRIGGER trg_notify_affiliate_delivered
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_affiliate_delivered();


-- --------------------------------------------
-- 10) RPC: regional manager stock adjust
-- --------------------------------------------
CREATE OR REPLACE FUNCTION rm_adjust_wilaya_stock(
  p_product_id UUID,
  p_wilaya_id INT,
  p_delta INT,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prf RECORD;
  allowed BOOLEAN;
BEGIN
  IF get_user_role() <> 'regional_manager'::user_role THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO prf FROM profiles WHERE user_id = auth.uid();
  allowed := prf.wilaya_id = p_wilaya_id OR prf.assigned_wilayas @> to_jsonb(p_wilaya_id::text);
  IF NOT allowed THEN
    RAISE EXCEPTION 'Wilaya not assigned';
  END IF;

  INSERT INTO product_wilaya_stock (product_id, wilaya_id, quantity)
  VALUES (p_product_id, p_wilaya_id, GREATEST(0, p_delta))
  ON CONFLICT (product_id, wilaya_id) DO UPDATE SET
    quantity = GREATEST(0, product_wilaya_stock.quantity + p_delta),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION rm_adjust_wilaya_stock(UUID, INT, INT, TEXT) TO authenticated;


-- --------------------------------------------
-- 11) Admin analytics RPC
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_admin_platform_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN json_build_object(
    'order_count', (SELECT COUNT(*)::bigint FROM orders),
    'gmv_total', (SELECT COALESCE(SUM(total), 0) FROM orders),
    'platform_fees_collected', (SELECT COALESCE(SUM(platform_fee), 0) FROM settlements WHERE status = 'settled'),
    'active_stores', (SELECT COUNT(*)::bigint FROM stores WHERE is_active = true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_platform_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION get_merchant_wilaya_stats(p_store_id UUID)
RETURNS TABLE(wilaya_id INT, wilaya_name TEXT, order_count BIGINT, revenue NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id AND owner_id = auth.uid())
     AND get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT o.wilaya_id::INT,
         COALESCE(w.name, o.wilaya, '') AS wilaya_name,
         COUNT(*)::BIGINT,
         COALESCE(SUM(o.total), 0)::NUMERIC
  FROM orders o
  LEFT JOIN wilayas w ON w.id = o.wilaya_id
  WHERE o.store_id = p_store_id AND o.wilaya_id IS NOT NULL
  GROUP BY o.wilaya_id, w.name, o.wilaya
  ORDER BY 4 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merchant_wilaya_stats(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION notify_rms_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wilaya_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, deeplink)
    SELECT p.user_id,
      'طلب جديد',
      'تم استلام طلب في ولايتك',
      '/(regional_manager)/orders?highlight=' || NEW.id::text
    FROM profiles p
    WHERE p.role = 'regional_manager'::user_role
      AND (
        p.wilaya_id = NEW.wilaya_id
        OR p.assigned_wilayas @> to_jsonb(NEW.wilaya_id::text)
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_delivery_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.delivery_company_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.delivery_company_id IS DISTINCT FROM NEW.delivery_company_id) THEN
    SELECT user_id INTO v_uid FROM profiles WHERE id = NEW.delivery_company_id;
    IF v_uid IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, deeplink)
      VALUES (
        v_uid,
        'طلب توصيل',
        'تم تعيين طلب توصيل لك',
        '/(delivery)/deliveries?highlight=' || NEW.order_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_affiliate_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oid UUID;
  v_aff UUID;
  v_uid UUID;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
    v_oid := NEW.order_id;
    SELECT o.affiliate_id INTO v_aff FROM orders o WHERE o.id = v_oid;
    IF v_aff IS NOT NULL THEN
      SELECT user_id INTO v_uid FROM affiliates WHERE id = v_aff;
      IF v_uid IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, body, deeplink)
        VALUES (
          v_uid,
          'تم التوصيل',
          'تم توصيل طلب — تم إضافة الربح إلى محفظتك',
          '/(affiliate)/orders?highlight=' || v_oid::text
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- --------------------------------------------
-- 12) Merchant onboarding flag on signup
-- --------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r user_role;
BEGIN
  r := COALESCE(NEW.raw_user_meta_data->>'role', 'affiliate')::user_role;
  INSERT INTO profiles (user_id, role, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN r = 'merchant'::user_role THEN false ELSE true END
  );
  RETURN NEW;
END;
$$;
