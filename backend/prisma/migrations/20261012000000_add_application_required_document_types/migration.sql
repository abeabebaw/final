ALTER TABLE "applications"
ADD COLUMN "required_document_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
