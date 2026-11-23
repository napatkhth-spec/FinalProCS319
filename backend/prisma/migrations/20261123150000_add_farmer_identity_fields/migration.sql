-- Add optional identity fields so existing farmer profiles remain unchanged.
ALTER TABLE "farmer_profiles"
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "nationalIdCiphertext" TEXT,
  ADD COLUMN "nationalIdHash" CHAR(64);

CREATE UNIQUE INDEX "farmer_profiles_nationalIdHash_key"
  ON "farmer_profiles"("nationalIdHash");

-- Normalize case and repeated/outer whitespace when enforcing unique shop names.
CREATE UNIQUE INDEX "farmer_profiles_shop_name_normalized_key"
  ON "farmer_profiles" (
    lower(regexp_replace(btrim("shopName"), '[[:space:]]+', ' ', 'g'))
  );
