ALTER TABLE "Estimate" ADD COLUMN "sectorId" TEXT;

CREATE INDEX "Estimate_sectorId_idx" ON "Estimate"("sectorId");

ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
