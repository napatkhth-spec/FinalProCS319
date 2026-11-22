-- Store newly uploaded product images in PostgreSQL BYTEA.
-- Nullable columns preserve existing ProductImage rows and their storagePath values.
ALTER TABLE "product_images"
  ADD COLUMN "imageData" BYTEA,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER;
