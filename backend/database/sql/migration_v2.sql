-- CESUCAR v2 Migration — run this in Supabase SQL Editor
-- Adds neighborhood and vehicle fields to users, neighborhood to ride_offers

ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_model   VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_brand   VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_color   VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_seats   SMALLINT;

ALTER TABLE ride_offers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
