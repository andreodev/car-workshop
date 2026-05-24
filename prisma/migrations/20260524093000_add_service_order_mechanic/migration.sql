ALTER TABLE "ServiceOrder" ADD COLUMN "mechanicId" TEXT;

CREATE INDEX "ServiceOrder_mechanicId_idx" ON "ServiceOrder"("mechanicId");

ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
