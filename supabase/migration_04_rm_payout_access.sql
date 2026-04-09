-- ============================================
-- Regional Manager Payout Access
-- Allows RMs to view and process payouts for stores in their wilayas
-- ============================================

-- SELECT Policy
DROP POLICY IF EXISTS "Regional managers can view wilaya store payouts" ON payout_requests;
CREATE POLICY "Regional managers can view wilaya store payouts"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM stores s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE s.id = payout_requests.store_id
        AND s.wilaya_id IS NOT NULL
        AND (
          p.wilaya_id = s.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id))
        )
    )
  );

-- UPDATE Policy
DROP POLICY IF EXISTS "Regional managers can update wilaya store payouts" ON payout_requests;
CREATE POLICY "Regional managers can update wilaya store payouts"
  ON payout_requests FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM stores s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE s.id = payout_requests.store_id
        AND s.wilaya_id IS NOT NULL
        AND (
          p.wilaya_id = s.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id))
        )
    )
  )
  WITH CHECK (
    get_user_role() = 'regional_manager'::user_role
    AND EXISTS (
      SELECT 1 FROM stores s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE s.id = payout_requests.store_id
        AND s.wilaya_id IS NOT NULL
        AND (
          p.wilaya_id = s.wilaya_id
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id::text))
          OR (p.assigned_wilayas IS NOT NULL AND p.assigned_wilayas @> to_jsonb(s.wilaya_id))
        )
    )
  );
