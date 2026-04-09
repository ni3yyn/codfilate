-- ============================================
-- Codfilate SaaS Affiliate Platform
-- Full Database Schema with RLS
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NON-DESTRUCTIVE INITIALIZATION
-- ============================================
-- Scripts below use CREATE TABLE IF NOT EXISTS and DROP POLICY IF EXISTS
-- to ensure schema updates don't destroy your users, stores, or orders.

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'merchant', 'affiliate');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
        CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
        CREATE TYPE payout_status AS ENUM ('pending', 'paid', 'rejected', 'cancelled');
    END IF;
END $$;

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'affiliate',
  store_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- STORES
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6C5CE7',
  secondary_color TEXT NOT NULL DEFAULT '#A29BFE',
  accent_color TEXT NOT NULL DEFAULT '#00CEC9',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Add FK from profiles to stores
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_profiles_store_id') THEN
        ALTER TABLE profiles
          ADD CONSTRAINT fk_profiles_store_id
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(store_id, is_active);

-- ============================================
-- AFFILIATES
-- ============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id),
  CONSTRAINT fk_affiliates_profile
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_affiliates_store_id ON affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  referral_code TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  wilaya TEXT,
  commune TEXT,
  customer_address TEXT,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  tracking_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(store_id, status);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- REFERRALS (click tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_store_id ON referrals(store_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status commission_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_store_id ON commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON commissions(order_id);

-- ============================================
-- PAYOUT REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL, -- e.g. 'CCP', 'BaridiMob', 'Paysera'
  payment_details TEXT NOT NULL, -- e.g. RIP or Account Number
  status payout_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_store_id ON payout_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_affiliate_id ON payout_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper function: get user's profile
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT store_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ---- PROFILES ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- STORES ----
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active stores" ON stores;
CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Merchants can manage own store" ON stores;
CREATE POLICY "Merchants can manage own store"
  ON stores FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all stores" ON stores;
CREATE POLICY "Admins can manage all stores"
  ON stores FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- PRODUCTS ----
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Merchants can manage own products" ON products;
CREATE POLICY "Merchants can manage own products"
  ON products FOR ALL
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products"
  ON products FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- AFFILIATES ----
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own records" ON affiliates;
CREATE POLICY "Affiliates can view own records"
  ON affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Affiliates can insert own records" ON affiliates;
CREATE POLICY "Affiliates can insert own records"
  ON affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can view store affiliates" ON affiliates;
CREATE POLICY "Merchants can view store affiliates"
  ON affiliates FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can manage store affiliates" ON affiliates;
CREATE POLICY "Merchants can manage store affiliates"
  ON affiliates FOR UPDATE
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all affiliates" ON affiliates;
CREATE POLICY "Admins can manage all affiliates"
  ON affiliates FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- ORDERS ----
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can manage store orders" ON orders;
DROP POLICY IF EXISTS "Affiliates can insert store orders" ON orders;
DROP POLICY IF EXISTS "Allow members to insert orders" ON orders;
DROP POLICY IF EXISTS "Affiliates can view linked orders" ON orders;
DROP POLICY IF EXISTS "Unified Order Insertion" ON orders;
DROP POLICY IF EXISTS "Unified Order Viewing" ON orders;

-- Unified Insert Policy (Fixes 42501 for both roles)
CREATE POLICY "Unified Order Insertion"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) -- Owner
    OR
    store_id IN (SELECT store_id FROM affiliates WHERE user_id = auth.uid()) -- Affiliate
  );

-- View Policy
DROP POLICY IF EXISTS "Unified Order Viewing" ON orders; -- Redundant but safe
CREATE POLICY "Unified Order Viewing"
  ON orders FOR SELECT
  TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) -- Owner
    OR
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) -- Affiliate
  );

-- Admin Full Access
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Merchant Update Policy (Missing before!)
DROP POLICY IF EXISTS "Merchants can update store orders" ON orders;
CREATE POLICY "Merchants can update store orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- ---- ORDER ITEMS ----
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can manage store order items" ON order_items;
DROP POLICY IF EXISTS "Affiliates can insert store order items" ON order_items;
DROP POLICY IF EXISTS "Unified Order Items Insertion" ON order_items;

-- Unified Insert Policy (Fixes 42501 for both roles)
CREATE POLICY "Unified Order Items Insertion"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) -- Owner
    OR
    store_id IN (SELECT store_id FROM affiliates WHERE user_id = auth.uid()) -- Affiliate
  );

-- View Policy
DROP POLICY IF EXISTS "Allow members to view order items" ON order_items;
CREATE POLICY "Allow members to view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) -- Owner
    OR
    store_id IN (SELECT store_id FROM affiliates WHERE user_id = auth.uid()) -- Affiliate
  );

-- Admin Full Access
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
CREATE POLICY "Admins can manage all order items"
  ON order_items FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Merchant Update Policy (Missing before!)
DROP POLICY IF EXISTS "Merchants can update store order items" ON order_items;
CREATE POLICY "Merchants can update store order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- ---- REFERRALS ----
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own referrals" ON referrals;
CREATE POLICY "Affiliates can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can view store referrals" ON referrals;
CREATE POLICY "Merchants can view store referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all referrals" ON referrals;
CREATE POLICY "Admins can manage all referrals"
  ON referrals FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- COMMISSIONS ----
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own commissions" ON commissions;
CREATE POLICY "Affiliates can view own commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can manage store commissions" ON commissions;
CREATE POLICY "Merchants can manage store commissions"
  ON commissions FOR ALL
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all commissions" ON commissions;
CREATE POLICY "Admins can manage all commissions"
  ON commissions FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- PAYOUT REQUESTS ----
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can manage own payouts" ON payout_requests;
CREATE POLICY "Affiliates can manage own payouts"
  ON payout_requests FOR ALL
  TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()))
  WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can view store payouts" ON payout_requests;
CREATE POLICY "Merchants can view store payouts"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can update store payouts" ON payout_requests;
CREATE POLICY "Merchants can update store payouts"
  ON payout_requests FOR UPDATE
  TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all payouts" ON payout_requests;
CREATE POLICY "Admins can manage all payouts"
  ON payout_requests FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Regional managers can manage payouts for their wilayas" ON payout_requests;
CREATE POLICY "Regional managers can manage payouts for their wilayas"
  ON payout_requests FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'regional_manager' AND 
    store_id IN (
      SELECT id FROM stores 
      WHERE wilaya_id IN (
        SELECT unnest(assigned_wilayas) FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- AUTO-UPDATE TRIGGER for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stores_updated_at') THEN
    CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_affiliates_updated_at') THEN
    CREATE TRIGGER trg_affiliates_updated_at BEFORE UPDATE ON affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_commissions_updated_at') THEN
    CREATE TRIGGER trg_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payout_requests_updated_at') THEN
    CREATE TRIGGER trg_payout_requests_updated_at BEFORE UPDATE ON payout_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================
-- AUTO-CREATE PROFILE on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'affiliate')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- ============================================
-- AUTOMATED COMMISSION & AFFILIATE TRACKING
-- ============================================

-- 1. Auto Generate Commission when an Order Item is placed
CREATE OR REPLACE FUNCTION generate_commission_from_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_affiliate_id UUID;
  v_product_commission_rate NUMERIC;
  v_existing_commission_id UUID;
  v_calculated_amount NUMERIC;
BEGIN
  -- Check if order has an affiliate
  SELECT affiliate_id INTO v_affiliate_id 
  FROM orders WHERE id = NEW.order_id;

  IF v_affiliate_id IS NOT NULL THEN
    -- Get product commission rate
    SELECT commission_rate INTO v_product_commission_rate 
    FROM products WHERE id = NEW.product_id;

    IF v_product_commission_rate > 0 THEN
      -- Calculate this item's commission block
      v_calculated_amount := (NEW.unit_price * NEW.quantity) * (v_product_commission_rate / 100);

      -- Check if commission row exists for this order
      SELECT id INTO v_existing_commission_id 
      FROM commissions WHERE order_id = NEW.order_id LIMIT 1;

      IF v_existing_commission_id IS NOT NULL THEN
        UPDATE commissions 
        SET amount = amount + v_calculated_amount
        WHERE id = v_existing_commission_id;
      ELSE
        INSERT INTO commissions (store_id, affiliate_id, order_id, amount, status)
        VALUES (NEW.store_id, v_affiliate_id, NEW.order_id, v_calculated_amount, 'pending');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_generate_commission') THEN
    CREATE TRIGGER trg_generate_commission
      AFTER INSERT ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION generate_commission_from_item();
  END IF;
END $$;


-- 2. Auto Approve Commission & Pay Affiliate on Delivery
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_commission_amount NUMERIC;
BEGIN
  -- If status transitioned to delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    
    -- Approve commission
    UPDATE commissions 
    SET status = 'approved' 
    WHERE order_id = NEW.id AND status = 'pending';

    -- Sum up approved commission for this order
    SELECT COALESCE(SUM(amount), 0) INTO v_commission_amount 
    FROM commissions 
    WHERE order_id = NEW.id AND status = 'approved';

    IF v_commission_amount > 0 AND NEW.affiliate_id IS NOT NULL THEN
      -- Credit the affiliate
      UPDATE affiliates 
      SET total_earnings = total_earnings + v_commission_amount,
          total_conversions = total_conversions + 1
      WHERE id = NEW.affiliate_id;
    END IF;

  END IF;

  -- If status transitioned to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE commissions 
    SET status = 'rejected' 
    WHERE order_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_approve_commission') THEN
    CREATE TRIGGER trg_auto_approve_commission
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION handle_order_delivered();
  END IF;
END $$;


-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;


-- Storage policies
DROP POLICY IF EXISTS "Public read for store assets" ON storage.objects;
CREATE POLICY "Public read for store assets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('store-assets', 'product-images', 'avatars'));

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('store-assets', 'product-images', 'avatars'));

DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);

