-- Check if the RM's wilayas include the stores of these affiliate payouts

-- 1. Find the RM's assigned wilayas
SELECT id, user_id, full_name, wilaya_id, assigned_wilayas
FROM profiles
WHERE role = 'regional_manager';

-- 2. Find the wilayas of the stores in the payout requests
SELECT id as store_id, name as store_name, wilaya_id
FROM stores
WHERE id IN (
  'a4942a17-a6a7-4ad8-ba15-19f479d628c0',
  '696331cb-609f-404e-96cf-bf77ffe58386'
);
