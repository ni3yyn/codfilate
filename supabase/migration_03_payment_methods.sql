-- migration_03_payment_methods.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ccp_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baridimob_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flexy_number text;
