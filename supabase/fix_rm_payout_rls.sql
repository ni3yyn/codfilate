-- ============================================
-- FIX v3: Ensure RM RLS Policy Works with INT arrays
-- Run this in Supabase SQL Editor
-- ============================================

DROP POLICY IF EXISTS "payout_requests_select" ON payout_requests;
DROP POLICY IF EXISTS "payout_requests_update_rm" ON payout_requests;

CREATE POLICY "payout_requests_select"
  ON payout_requests FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    OR requester_user_id = auth.uid()
    OR (store_id IS NOT NULL AND store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
    OR (affiliate_id IS NOT NULL AND affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()))
    OR (
      get_user_role() = 'regional_manager'
      AND (
        (store_id IS NOT NULL AND store_id IN (
          SELECT s.id FROM stores s
          JOIN profiles p ON p.user_id = auth.uid()
          WHERE p.role = 'regional_manager'
            AND (
              s.wilaya_id = p.wilaya_id 
              OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
              OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
            )
        ))
        OR
        (affiliate_id IS NOT NULL AND affiliate_id IN (
          SELECT a.id FROM affiliates a
          JOIN stores s ON s.id = a.store_id
          JOIN profiles p ON p.user_id = auth.uid()
          WHERE p.role = 'regional_manager'
            AND (
              s.wilaya_id = p.wilaya_id 
              OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
              OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
            )
        ))
      )
    )
  );

CREATE POLICY "payout_requests_update_rm"
  ON payout_requests FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'regional_manager'
    AND (
      (store_id IS NOT NULL AND store_id IN (
        SELECT s.id FROM stores s
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE p.role = 'regional_manager'
          AND (
            s.wilaya_id = p.wilaya_id 
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
          )
      ))
      OR
      (affiliate_id IS NOT NULL AND affiliate_id IN (
        SELECT a.id FROM affiliates a
        JOIN stores s ON s.id = a.store_id
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE p.role = 'regional_manager'
          AND (
            s.wilaya_id = p.wilaya_id 
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
          )
      ))
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'
    AND (
      (store_id IS NOT NULL AND store_id IN (
        SELECT s.id FROM stores s
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE p.role = 'regional_manager'
          AND (
            s.wilaya_id = p.wilaya_id 
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
          )
      ))
      OR
      (affiliate_id IS NOT NULL AND affiliate_id IN (
        SELECT a.id FROM affiliates a
        JOIN stores s ON s.id = a.store_id
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE p.role = 'regional_manager'
          AND (
            s.wilaya_id = p.wilaya_id 
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id::text)
            OR p.assigned_wilayas @> to_jsonb(s.wilaya_id)
          )
      ))
    )
  );

-- Double check if we need to fetch affiliate payouts where store_id IS NULL 
-- (Just in case the backfill missed any, though it shouldn't have)
