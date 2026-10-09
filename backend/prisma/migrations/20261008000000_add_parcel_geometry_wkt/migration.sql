ALTER TABLE "parcels"
ADD COLUMN IF NOT EXISTS "geometry_wkt" TEXT;
