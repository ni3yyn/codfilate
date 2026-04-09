-- ============================================
-- Admin: provision regional managers by email + nationwide merchant activation
-- Run after migration_rm_wilaya_rls_and_merchant_activation.sql
-- Safe to re-run (CREATE OR REPLACE)
-- ============================================

-- 1) Safer wilaya check for RM activation (numeric or string elements in JSONB)
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
        (p.wilaya_id IS NOT NULL AND p.wilaya_id = v_w)
        OR (
          p.assigned_wilayas IS NOT NULL
          AND jsonb_typeof(p.assigned_wilayas) = 'array'
          AND jsonb_array_length(p.assigned_wilayas) > 0
          AND (
            p.assigned_wilayas @> to_jsonb(v_w)
            OR p.assigned_wilayas @> to_jsonb(v_w::text)
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(p.assigned_wilayas) AS elem
              WHERE (elem #>> '{}')::int = v_w
            )
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'wilaya not assigned to this manager — راجع ولايات المدير من مستخدمين → تعيين الولايات';
  END IF;

  UPDATE stores SET
    rm_activated_at = now(),
    is_active = true,
    updated_at = now()
  WHERE id = p_store_id;
END;
$$;

-- 2) HQ activates any merchant store (all wilayas)
CREATE OR REPLACE FUNCTION admin_activate_merchant_store(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'store not found';
  END IF;

  UPDATE stores SET
    rm_activated_at = now(),
    is_active = true,
    updated_at = now()
  WHERE id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_activate_merchant_store(UUID) TO authenticated;

-- 3) Set RM role + wilayah after auth user exists (create user in Dashboard first)
CREATE OR REPLACE FUNCTION admin_provision_regional_manager(
  p_email TEXT,
  p_full_name TEXT,
  p_assigned_wilayas JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_pid UUID;
  v_w INT;
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_assigned_wilayas IS NULL
     OR jsonb_typeof(p_assigned_wilayas) <> 'array'
     OR jsonb_array_length(p_assigned_wilayas) < 1 THEN
    RAISE EXCEPTION 'اختر ولاية واحدة على الأقل';
  END IF;

  v_w := (p_assigned_wilayas->0)::text::int;

  SELECT id INTO v_uid FROM auth.users WHERE lower(trim(email)) = lower(trim(p_email));
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستخدم بهذا البريد — أنشئ الحساب من Supabase ثم أعد المحاولة';
  END IF;

  SELECT id INTO v_pid FROM profiles WHERE user_id = v_uid;

  IF v_pid IS NULL THEN
    INSERT INTO profiles (user_id, role, full_name, wilaya_id, assigned_wilayas, onboarding_completed)
    VALUES (
      v_uid,
      'regional_manager',
      NULLIF(trim(p_full_name), ''),
      v_w,
      p_assigned_wilayas,
      true
    )
    RETURNING id INTO v_pid;
  ELSE
    UPDATE profiles SET
      role = 'regional_manager',
      full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
      wilaya_id = v_w,
      assigned_wilayas = p_assigned_wilayas,
      onboarding_completed = true,
      updated_at = now()
    WHERE id = v_pid;
  END IF;

  RETURN v_pid;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_provision_regional_manager(TEXT, TEXT, JSONB) TO authenticated;
