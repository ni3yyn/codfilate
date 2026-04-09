-- ============================================
-- DIAGNOSTIC: Check merchant wallet & settlements
-- Run this in Supabase SQL Editor
-- Replace 'MERCHANT_EMAIL_HERE' with the actual merchant email
-- ============================================

-- 1. Find the merchant's user_id and store_id
SELECT 
  p.user_id,
  p.full_name,
  p.role,
  p.store_id,
  s.id as store_table_id,
  s.name as store_name,
  s.owner_id,
  s.wilaya_id
FROM profiles p
LEFT JOIN stores s ON s.owner_id = p.user_id
WHERE p.role = 'merchant'
LIMIT 10;

-- 2. Check wallet balance for all merchants
SELECT 
  p.full_name,
  p.user_id,
  w.balance,
  w.total_earned,
  w.total_withdrawn,
  w.updated_at
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.user_id
WHERE p.role = 'merchant';

-- 3. Check if any orders were delivered for merchant stores
SELECT 
  o.id,
  o.store_id,
  o.status,
  o.base_price,
  o.sale_price,
  o.delivered_at,
  s.name as store_name,
  s.owner_id
FROM orders o
JOIN stores s ON s.id = o.store_id
WHERE o.status = 'delivered'
ORDER BY o.delivered_at DESC
LIMIT 20;

-- 4. Check settlements for delivered orders
SELECT 
  st.order_id,
  st.store_id,
  st.merchant_amount,
  st.marketer_commission,
  st.regional_manager_commission,
  st.status,
  st.settled_at
FROM settlements st
ORDER BY st.settled_at DESC
LIMIT 20;

-- 5. Check wallet_ledger for merchant credits
SELECT 
  wl.user_id,
  p.full_name,
  wl.amount,
  wl.ledger_type,
  wl.ref_type,
  wl.balance_after,
  wl.created_at
FROM wallet_ledger wl
JOIN profiles p ON p.user_id = wl.user_id
WHERE p.role = 'merchant'
ORDER BY wl.created_at DESC
LIMIT 20;

-- 6. Check payout_requests and whether store_id is set
SELECT 
  pr.id,
  pr.requester_user_id,
  pr.store_id,
  pr.amount,
  pr.status,
  pr.method,
  p.full_name,
  p.role
FROM payout_requests pr
JOIN profiles p ON p.user_id = pr.requester_user_id
ORDER BY pr.created_at DESC
LIMIT 20;
