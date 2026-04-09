-- ============================================
-- BACKFILL: Credit merchant wallets for all
-- delivered orders that were never settled
-- ============================================
-- This uses the idempotent process_order_delivered_settlement()
-- function, so it's safe to re-run — it won't double-credit.

DO $$
DECLARE
  rec RECORD;
  v_delivery_fee NUMERIC;
  v_count INT := 0;
BEGIN
  FOR rec IN
    SELECT o.id AS order_id, o.store_id, o.delivery_fee AS order_delivery_fee
    FROM orders o
    WHERE o.status = 'delivered'
    ORDER BY o.created_at ASC
  LOOP
    -- Try to get delivery fee from delivery_requests if available
    SELECT COALESCE(dr.delivery_fee, 0) INTO v_delivery_fee
    FROM delivery_requests dr
    WHERE dr.order_id = rec.order_id
      AND dr.status = 'delivered'
    LIMIT 1;

    -- Fallback to order-level delivery fee
    v_delivery_fee := COALESCE(v_delivery_fee, rec.order_delivery_fee, 0);

    -- Process settlement (idempotent — safe to re-run)
    PERFORM process_order_delivered_settlement(rec.order_id, v_delivery_fee);
    v_count := v_count + 1;

    RAISE NOTICE 'Settled order % (delivery_fee: %)', rec.order_id, v_delivery_fee;
  END LOOP;

  RAISE NOTICE '=== BACKFILL COMPLETE: % orders processed ===', v_count;
END;
$$;

-- Verify: Check wallet balances after backfill
SELECT 
  p.full_name,
  p.role,
  w.balance,
  w.total_earned,
  w.total_withdrawn
FROM profiles p
JOIN wallets w ON w.user_id = p.user_id
WHERE w.balance > 0 OR w.total_earned > 0
ORDER BY w.balance DESC;
