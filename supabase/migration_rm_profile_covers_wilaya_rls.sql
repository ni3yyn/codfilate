-- ============================================
-- Single source of truth: RM sees/updates orders in a wilaya when
-- profiles.wilaya_id matches OR assigned_wilayas contains it (numeric OR string JSON elements).
-- Fixes empty lists when @> checks failed on mixed JSON types.
-- Run after migration_admin_provision_rm_activate.sql (or after migration_rm_wilaya_rls).
-- ============================================

CREATE OR REPLACE FUNCTION rm_profile_covers_wilaya(p_user_id uuid, p_wilaya int)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = p_user_id
      AND p_wilaya IS NOT NULL
      AND (
        p.wilaya_id IS NOT NULL AND p.wilaya_id = p_wilaya
        OR (
          p.assigned_wilayas IS NOT NULL
          AND jsonb_typeof(p.assigned_wilayas) = 'array'
          AND jsonb_array_length(p.assigned_wilayas) > 0
          AND (
            p.assigned_wilayas @> to_jsonb(p_wilaya)
            OR p.assigned_wilayas @> to_jsonb(p_wilaya::text)
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(p.assigned_wilayas) AS elem
              WHERE (elem #>> '{}')::int = p_wilaya
            )
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION rm_profile_covers_wilaya(uuid, int) TO authenticated;

-- Orders
DROP POLICY IF EXISTS "Regional managers can view wilaya orders" ON orders;
CREATE POLICY "Regional managers can view wilaya orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND orders.wilaya_id IS NOT NULL
    AND rm_profile_covers_wilaya(auth.uid(), orders.wilaya_id)
  );

DROP POLICY IF EXISTS "Regional managers can update wilaya orders" ON orders;
CREATE POLICY "Regional managers can update wilaya orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND wilaya_id IS NOT NULL
    AND rm_profile_covers_wilaya(auth.uid(), wilaya_id)
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'::user_role
    AND wilaya_id IS NOT NULL
    AND rm_profile_covers_wilaya(auth.uid(), wilaya_id)
  );

-- Order items
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
        AND rm_profile_covers_wilaya(auth.uid(), o.wilaya_id)
    )
  );

-- Stores (RM list / pending merchants)
DROP POLICY IF EXISTS "Regional managers can view stores in wilaya" ON stores;
CREATE POLICY "Regional managers can view stores in wilaya"
  ON stores FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND stores.wilaya_id IS NOT NULL
    AND rm_profile_covers_wilaya(auth.uid(), stores.wilaya_id)
  );

-- Delivery requests
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
        AND rm_profile_covers_wilaya(auth.uid(), o.wilaya_id)
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = delivery_requests.order_id
        AND o.wilaya_id IS NOT NULL
        AND rm_profile_covers_wilaya(auth.uid(), o.wilaya_id)
    )
  );

-- Keep activate-store aligned with same rule
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

  IF NOT rm_profile_covers_wilaya(auth.uid(), v_w) THEN
    RAISE EXCEPTION 'wilaya not assigned to this manager — راجع تعيين الولايات';
  END IF;

  UPDATE stores SET
    rm_activated_at = now(),
    is_active = true,
    updated_at = now()
  WHERE id = p_store_id;
END;
$$;
