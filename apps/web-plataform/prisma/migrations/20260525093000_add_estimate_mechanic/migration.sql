ALTER TABLE "Estimate" ADD COLUMN "mechanicId" TEXT;

CREATE INDEX "Estimate_mechanicId_idx" ON "Estimate"("mechanicId");

ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
