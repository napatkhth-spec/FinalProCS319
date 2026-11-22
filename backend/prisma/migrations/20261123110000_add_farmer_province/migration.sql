-- Add a nullable province field for farmer shop locations.
-- Existing farmer profiles keep their current data and receive NULL.
ALTER TABLE "farmer_profiles"
  ADD COLUMN "province" TEXT;
