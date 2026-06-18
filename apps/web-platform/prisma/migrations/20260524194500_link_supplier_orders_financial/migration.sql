-- AlterTable
ALTER TABLE "SupplierOrder" ADD COLUMN "total" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN "supplierOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_supplierOrderId_key" ON "FinancialAccount"("supplierOrderId");

-- CreateIndex
CREATE INDEX "FinancialAccount_supplierId_idx" ON "FinancialAccount"("supplierId");

-- CreateIndex
CREATE INDEX "FinancialAccount_supplierOrderId_idx" ON "FinancialAccount"("supplierOrderId");

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_supplierOrderId_fkey" FOREIGN KEY ("supplierOrderId") REFERENCES "SupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
