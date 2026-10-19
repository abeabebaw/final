ALTER TABLE "parcels"
ADD COLUMN "parent_parcel_id" UUID,
ADD COLUMN "split_transaction_id" UUID;

ALTER TABLE "parcels"
ADD CONSTRAINT "parcels_parent_parcel_id_fkey"
FOREIGN KEY ("parent_parcel_id") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "parcels_split_transaction_id_fkey"
FOREIGN KEY ("split_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_parcels_split_transaction" ON "parcels"("split_transaction_id");
