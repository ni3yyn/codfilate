-- ============================================
-- Migration: Regional Manager (+ legacy tables). Role delivery_company removed from product —
-- use migration_remove_delivery_company_role.sql on existing DBs.
-- Non-destructive — safe to re-run
-- ============================================

-- ============================================
-- 1. EXTEND ENUMS
-- ============================================
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block
-- Run these individually in Supabase SQL Editor:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'regional_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'regional_manager';
  END IF;
END $$;

-- Extend order_status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed_by_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
    ALTER TYPE order_status ADD VALUE 'confirmed_by_manager';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'picked_up' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
    ALTER TYPE order_status ADD VALUE 'picked_up';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_transit' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
    ALTER TYPE order_status ADD VALUE 'in_transit';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'failed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
    ALTER TYPE order_status ADD VALUE 'failed';
  END IF;
END $$;

-- 'returned' may already exist from prior migration, safe to skip


-- ============================================
-- 2. WILAYAS TABLE (58 Algerian Wilayas)
-- ============================================
CREATE TABLE IF NOT EXISTS wilayas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_fr TEXT,
  code TEXT NOT NULL UNIQUE,
  home_delivery_fee INT NOT NULL DEFAULT 500,
  office_delivery_fee INT NOT NULL DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed all 58 wilayas with default fees
INSERT INTO wilayas (code, name, name_fr, home_delivery_fee, office_delivery_fee) VALUES
  ('01', 'أدرار', 'Adrar', 800, 500),
  ('02', 'الشلف', 'Chlef', 500, 300),
  ('03', 'الأغواط', 'Laghouat', 600, 400),
  ('04', 'أم البواقي', 'Oum El Bouaghi', 500, 300),
  ('05', 'باتنة', 'Batna', 500, 300),
  ('06', 'بجاية', 'Béjaïa', 500, 300),
  ('07', 'بسكرة', 'Biskra', 500, 300),
  ('08', 'بشار', 'Béchar', 800, 500),
  ('09', 'البليدة', 'Blida', 400, 250),
  ('10', 'البويرة', 'Bouira', 500, 300),
  ('11', 'تمنراست', 'Tamanrasset', 1000, 700),
  ('12', 'تبسة', 'Tébessa', 500, 300),
  ('13', 'تلمسان', 'Tlemcen', 500, 300),
  ('14', 'تيارت', 'Tiaret', 500, 300),
  ('15', 'تيزي وزو', 'Tizi Ouzou', 500, 300),
  ('16', 'الجزائر', 'Alger', 400, 250),
  ('17', 'الجلفة', 'Djelfa', 500, 300),
  ('18', 'جيجل', 'Jijel', 500, 300),
  ('19', 'سطيف', 'Sétif', 500, 300),
  ('20', 'سعيدة', 'Saïda', 500, 300),
  ('21', 'سكيكدة', 'Skikda', 500, 300),
  ('22', 'سيدي بلعباس', 'Sidi Bel Abbès', 500, 300),
  ('23', 'عنابة', 'Annaba', 500, 300),
  ('24', 'قالمة', 'Guelma', 500, 300),
  ('25', 'قسنطينة', 'Constantine', 500, 300),
  ('26', 'المدية', 'Médéa', 500, 300),
  ('27', 'مستغانم', 'Mostaganem', 500, 300),
  ('28', 'المسيلة', 'M''Sila', 500, 300),
  ('29', 'معسكر', 'Mascara', 500, 300),
  ('30', 'ورقلة', 'Ouargla', 600, 400),
  ('31', 'وهران', 'Oran', 400, 250),
  ('32', 'البيض', 'El Bayadh', 600, 400),
  ('33', 'إيليزي', 'Illizi', 1000, 700),
  ('34', 'برج بوعريريج', 'Bordj Bou Arréridj', 500, 300),
  ('35', 'بومرداس', 'Boumerdès', 400, 250),
  ('36', 'الطارف', 'El Tarf', 500, 300),
  ('37', 'تندوف', 'Tindouf', 1000, 700),
  ('38', 'تيسمسيلت', 'Tissemsilt', 500, 300),
  ('39', 'الوادي', 'El Oued', 600, 400),
  ('40', 'خنشلة', 'Khenchela', 500, 300),
  ('41', 'سوق أهراس', 'Souk Ahras', 500, 300),
  ('42', 'تيبازة', 'Tipaza', 400, 250),
  ('43', 'ميلة', 'Mila', 500, 300),
  ('44', 'عين الدفلى', 'Aïn Defla', 500, 300),
  ('45', 'النعامة', 'Naâma', 600, 400),
  ('46', 'عين تموشنت', 'Aïn Témouchent', 500, 300),
  ('47', 'غرداية', 'Ghardaïa', 600, 400),
  ('48', 'غليزان', 'Relizane', 500, 300),
  ('49', 'تيميمون', 'Timimoun', 800, 500),
  ('50', 'برج باجي مختار', 'Bordj Badji Mokhtar', 1000, 700),
  ('51', 'أولاد جلال', 'Ouled Djellal', 600, 400),
  ('52', 'بني عباس', 'Béni Abbès', 800, 500),
  ('53', 'إن صالح', 'In Salah', 1000, 700),
  ('54', 'إن قزام', 'In Guezzam', 1000, 700),
  ('55', 'تقرت', 'Touggourt', 600, 400),
  ('56', 'جانت', 'Djanet', 1000, 700),
  ('57', 'المغير', 'El M''Ghair', 600, 400),
  ('58', 'المنيعة', 'El Meniaa', 600, 400)
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- 3. EXTEND PROFILES TABLE
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wilaya_id INT REFERENCES wilayas(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_wilayas JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_profiles_wilaya_id ON profiles(wilaya_id);


-- ============================================
-- 4. EXTEND ORDERS TABLE
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS regional_manager_id UUID REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_company_id UUID REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'home';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_updates JSONB DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wilaya_id INT REFERENCES wilayas(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_wilaya_id ON orders(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_orders_regional_manager ON orders(regional_manager_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_company ON orders(delivery_company_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_status ON orders(tracking_status);


-- ============================================
-- 5. DELIVERY REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  delivery_company_id UUID REFERENCES profiles(id),
  regional_manager_id UUID REFERENCES profiles(id),
  store_id UUID REFERENCES stores(id),
  wilaya_id INT REFERENCES wilayas(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','picked_up','in_transit','delivered','failed')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failed_reason TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  delivery_type TEXT DEFAULT 'home',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_order ON delivery_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_company ON delivery_requests(delivery_company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_wilaya ON delivery_requests(wilaya_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);


-- ============================================
-- 6. SETTLEMENTS TABLE (Profit Distribution)
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_id UUID REFERENCES stores(id),
  merchant_amount NUMERIC(10,2) DEFAULT 0,
  marketer_commission NUMERIC(10,2) DEFAULT 0,
  regional_manager_commission NUMERIC(10,2) DEFAULT 150,
  delivery_company_commission NUMERIC(10,2) DEFAULT 0,
  platform_fee NUMERIC(10,2) DEFAULT 200,
  admin_fee NUMERIC(10,2) DEFAULT 50,
  total_customer_paid NUMERIC(10,2) DEFAULT 0,
  settled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','settled','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_order ON settlements(order_id);
CREATE INDEX IF NOT EXISTS idx_settlements_store ON settlements(store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);


-- ============================================
-- 7. WALLETS TABLE (balance per user)
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);


-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- ---- WILAYAS ----
ALTER TABLE wilayas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view wilayas" ON wilayas;
CREATE POLICY "Anyone can view wilayas"
  ON wilayas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage wilayas" ON wilayas;
CREATE POLICY "Admins can manage wilayas"
  ON wilayas FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- DELIVERY REQUESTS ----
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delivery companies can view assigned requests" ON delivery_requests;
CREATE POLICY "Delivery companies can view assigned requests"
  ON delivery_requests FOR SELECT
  TO authenticated
  USING (
    delivery_company_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR regional_manager_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "Delivery companies can update assigned requests" ON delivery_requests;
CREATE POLICY "Delivery companies can update assigned requests"
  ON delivery_requests FOR UPDATE
  TO authenticated
  USING (
    delivery_company_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "Regional managers can insert delivery requests" ON delivery_requests;
CREATE POLICY "Regional managers can insert delivery requests"
  ON delivery_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'regional_manager'
  );

DROP POLICY IF EXISTS "Admins can manage all delivery requests" ON delivery_requests;
CREATE POLICY "Admins can manage all delivery requests"
  ON delivery_requests FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- SETTLEMENTS ----
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settlements" ON settlements;
CREATE POLICY "Users can view own settlements"
  ON settlements FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
      OR regional_manager_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
      OR delivery_company_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
      OR store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all settlements" ON settlements;
CREATE POLICY "Admins can manage all settlements"
  ON settlements FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- WALLETS ----
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all wallets" ON wallets;
CREATE POLICY "Admins can manage all wallets"
  ON wallets FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- ORDERS: Regional Manager access ----
DROP POLICY IF EXISTS "Regional managers can view wilaya orders" ON orders;
CREATE POLICY "Regional managers can view wilaya orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'
    AND wilaya_id IN (
      SELECT w.id FROM wilayas w
      WHERE w.id::text IN (
        SELECT jsonb_array_elements_text(p.assigned_wilayas)
        FROM profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Regional managers can update wilaya orders" ON orders;
CREATE POLICY "Regional managers can update wilaya orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'
    AND wilaya_id IN (
      SELECT w.id FROM wilayas w
      WHERE w.id::text IN (
        SELECT jsonb_array_elements_text(p.assigned_wilayas)
        FROM profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

-- ---- PROFILES: Extended view for managers ----
DROP POLICY IF EXISTS "Regional managers can view wilaya profiles" ON profiles;
CREATE POLICY "Regional managers can view wilaya profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'regional_manager');


-- ============================================
-- 9. TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-assign Regional Manager on order creation based on wilaya
CREATE OR REPLACE FUNCTION assign_regional_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  -- Find a regional manager assigned to this wilaya
  IF NEW.wilaya_id IS NOT NULL THEN
    SELECT id INTO v_manager_id
    FROM profiles
    WHERE role = 'regional_manager'
      AND (
        wilaya_id = NEW.wilaya_id
        OR assigned_wilayas @> to_jsonb(NEW.wilaya_id::text)
      )
    LIMIT 1;

    IF v_manager_id IS NOT NULL THEN
      NEW.regional_manager_id = v_manager_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_regional_manager ON orders;
CREATE TRIGGER trg_assign_regional_manager
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_regional_manager();


-- Auto-create wallet on user signup
CREATE OR REPLACE FUNCTION handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_wallet ON auth.users;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_create_wallet') THEN
    CREATE TRIGGER trg_create_wallet
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user_wallet();
  END IF;
END $$;


-- Handle delivery completion: settle payments and credit wallets
CREATE OR REPLACE FUNCTION handle_delivery_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_marketer_profit NUMERIC;
  v_delivery_fee NUMERIC;
  v_affiliate_user_id UUID;
  v_manager_user_id UUID;
  v_delivery_user_id UUID;
BEGIN
  -- Only trigger on status change to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN

    -- Set timestamps
    NEW.delivered_at = now();

    -- Get the related order
    SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;

    IF v_order IS NULL THEN RETURN NEW; END IF;

    v_delivery_fee = COALESCE(NEW.delivery_fee, 0);
    v_marketer_profit = COALESCE(v_order.sale_price, 0) - COALESCE(v_order.base_price, 0) - 200;
    IF v_marketer_profit < 0 THEN v_marketer_profit = 0; END IF;

    -- Create settlement record
    INSERT INTO settlements (
      order_id, store_id, merchant_amount, marketer_commission,
      regional_manager_commission, delivery_company_commission,
      platform_fee, admin_fee, total_customer_paid, settled_at, status
    ) VALUES (
      NEW.order_id,
      v_order.store_id,
      COALESCE(v_order.base_price, 0),
      v_marketer_profit,
      150,
      v_delivery_fee,
      200,
      50,
      COALESCE(v_order.sale_price, 0) + v_delivery_fee,
      now(),
      'settled'
    )
    ON CONFLICT (order_id) DO UPDATE SET
      status = 'settled',
      settled_at = now(),
      marketer_commission = EXCLUDED.marketer_commission,
      delivery_company_commission = EXCLUDED.delivery_company_commission,
      total_customer_paid = EXCLUDED.total_customer_paid;

    -- Update order status
    UPDATE orders SET status = 'delivered', tracking_status = 'delivered' WHERE id = NEW.order_id;

    -- Credit wallets
    -- 1. Marketer wallet
    IF v_order.affiliate_id IS NOT NULL THEN
      SELECT user_id INTO v_affiliate_user_id FROM affiliates WHERE id = v_order.affiliate_id;
      IF v_affiliate_user_id IS NOT NULL AND v_marketer_profit > 0 THEN
        UPDATE wallets SET
          balance = balance + v_marketer_profit,
          total_earned = total_earned + v_marketer_profit,
          updated_at = now()
        WHERE user_id = v_affiliate_user_id;

        -- Also update affiliates total_earnings for backward compat
        UPDATE affiliates SET
          total_earnings = total_earnings + v_marketer_profit,
          total_conversions = total_conversions + 1
        WHERE id = v_order.affiliate_id;
      END IF;
    END IF;

    -- 2. Regional Manager wallet
    IF v_order.regional_manager_id IS NOT NULL THEN
      SELECT user_id INTO v_manager_user_id FROM profiles WHERE id = v_order.regional_manager_id;
      IF v_manager_user_id IS NOT NULL THEN
        UPDATE wallets SET
          balance = balance + 150,
          total_earned = total_earned + 150,
          updated_at = now()
        WHERE user_id = v_manager_user_id;
      END IF;
    END IF;

    -- 3. Delivery Company wallet
    IF NEW.delivery_company_id IS NOT NULL THEN
      SELECT user_id INTO v_delivery_user_id FROM profiles WHERE id = NEW.delivery_company_id;
      IF v_delivery_user_id IS NOT NULL AND v_delivery_fee > 0 THEN
        UPDATE wallets SET
          balance = balance + v_delivery_fee,
          total_earned = total_earned + v_delivery_fee,
          updated_at = now()
        WHERE user_id = v_delivery_user_id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_settlement ON delivery_requests;
CREATE TRIGGER trg_delivery_settlement
  BEFORE UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_delivery_settlement();


-- Updated_at trigger for new tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_delivery_requests_updated_at') THEN
    CREATE TRIGGER trg_delivery_requests_updated_at BEFORE UPDATE ON delivery_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wallets_updated_at') THEN
    CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
