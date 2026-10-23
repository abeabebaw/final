ALTER TABLE "parcels"
ADD COLUMN IF NOT EXISTS "merged_into_parcel_id" UUID,
ADD COLUMN IF NOT EXISTS "merge_transaction_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcels_merged_into_parcel_id_fkey'
  ) THEN
    ALTER TABLE "parcels"
    ADD CONSTRAINT "parcels_merged_into_parcel_id_fkey"
    FOREIGN KEY ("merged_into_parcel_id") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcels_merge_transaction_id_fkey'
  ) THEN
    ALTER TABLE "parcels"
    ADD CONSTRAINT "parcels_merge_transaction_id_fkey"
    FOREIGN KEY ("merge_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_parcels_merge_transaction" ON "parcels"("merge_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_parcels_merged_into" ON "parcels"("merged_into_parcel_id");
