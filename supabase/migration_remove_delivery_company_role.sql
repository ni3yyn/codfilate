-- ============================================
-- Remove user role delivery_company (4 roles only:
-- admin = الإدارة العليا, regional_manager, merchant, affiliate).
-- Converts any legacy rows to admin; tightens profiles RLS.
-- Run after migration_rm_wilaya_rls_and_merchant_activation.sql (or any time once base exists).
-- Safe to re-run.
-- ============================================

-- Migrate data: same profiles.id so delivery_requests.delivery_company_id FKs stay valid
UPDATE public.profiles
SET role = 'admin'::user_role
WHERE role::text = 'delivery_company';

-- RLS: regional managers no longer share a policy with removed role
DROP POLICY IF EXISTS "Regional managers can view wilaya profiles" ON public.profiles;
CREATE POLICY "Regional managers can view wilaya profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'regional_manager'::user_role);
