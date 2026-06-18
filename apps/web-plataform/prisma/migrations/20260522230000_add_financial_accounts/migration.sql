-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "FinancialAccountStatus" AS ENUM ('ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "status" "FinancialAccountStatus" NOT NULL DEFAULT 'ABERTA',
    "description" TEXT NOT NULL,
    "clientId" TEXT,
    "counterparty" TEXT,
    "category" TEXT,
    "documentNumber" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2),
    "paymentMethod" "SalePaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_code_key" ON "FinancialAccount"("code");

-- CreateIndex
CREATE INDEX "FinancialAccount_code_idx" ON "FinancialAccount"("code");

-- CreateIndex
CREATE INDEX "FinancialAccount_type_idx" ON "FinancialAccount"("type");

-- CreateIndex
CREATE INDEX "FinancialAccount_status_idx" ON "FinancialAccount"("status");

-- CreateIndex
CREATE INDEX "FinancialAccount_dueDate_idx" ON "FinancialAccount"("dueDate");

-- CreateIndex
CREATE INDEX "FinancialAccount_clientId_idx" ON "FinancialAccount"("clientId");

-- CreateIndex
CREATE INDEX "FinancialAccount_description_idx" ON "FinancialAccount"("description");

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
