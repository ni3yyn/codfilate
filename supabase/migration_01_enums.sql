-- ============================================
-- PART 1: ENUM EXTENSIONS ONLY
-- Run this FIRST, then run migration_02_tables.sql
-- Safe to re-run (IF NOT EXISTS)
-- ============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'regional_manager';

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed_by_manager';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'failed';
