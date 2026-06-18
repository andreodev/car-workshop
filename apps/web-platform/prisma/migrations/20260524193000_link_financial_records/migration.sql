-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN "serviceOrderId" TEXT;

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN "saleId" TEXT;
ALTER TABLE "CashMovement" ADD COLUMN "financialAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_serviceOrderId_key" ON "FinancialAccount"("serviceOrderId");

-- CreateIndex
CREATE INDEX "FinancialAccount_serviceOrderId_idx" ON "FinancialAccount"("serviceOrderId");

-- CreateIndex
CREATE INDEX "CashMovement_saleId_idx" ON "CashMovement"("saleId");

-- CreateIndex
CREATE INDEX "CashMovement_financialAccountId_idx" ON "CashMovement"("financialAccountId");

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
