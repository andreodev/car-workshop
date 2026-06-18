ALTER TABLE "EstimateItem" ADD COLUMN "sectorId" TEXT;
ALTER TABLE "ServiceOrderItem" ADD COLUMN "sectorId" TEXT;

CREATE INDEX "EstimateItem_sectorId_idx" ON "EstimateItem"("sectorId");
CREATE INDEX "ServiceOrderItem_sectorId_idx" ON "ServiceOrderItem"("sectorId");

ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
