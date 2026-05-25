ALTER TABLE "EstimateItem" ADD COLUMN "catalogItemId" TEXT;

CREATE INDEX "EstimateItem_catalogItemId_idx" ON "EstimateItem"("catalogItemId");

ALTER TABLE "EstimateItem"
  ADD CONSTRAINT "EstimateItem_catalogItemId_fkey"
  FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
