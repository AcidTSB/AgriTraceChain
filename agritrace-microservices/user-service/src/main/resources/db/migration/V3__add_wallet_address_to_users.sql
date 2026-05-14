-- Add missing wallet_address column to match User entity mapping
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255);

ALTER TABLE facilities
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE facilities
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
