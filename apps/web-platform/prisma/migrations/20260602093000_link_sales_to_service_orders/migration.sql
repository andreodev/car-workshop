ALTER TABLE "Sale" ADD COLUMN "serviceOrderId" TEXT;

CREATE INDEX "Sale_serviceOrderId_idx" ON "Sale"("serviceOrderId");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
