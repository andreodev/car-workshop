-- CreateEnum
CREATE TYPE "FinancialCategoryType" AS ENUM ('RECEITA', 'DESPESA', 'AMBOS');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialCategoryType" NOT NULL DEFAULT 'AMBOS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "SalePaymentMethod",
    "documentNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_code_key" ON "FinancialCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_name_key" ON "FinancialCategory"("name");

-- CreateIndex
CREATE INDEX "FinancialCategory_code_idx" ON "FinancialCategory"("code");

-- CreateIndex
CREATE INDEX "FinancialCategory_name_idx" ON "FinancialCategory"("name");

-- CreateIndex
CREATE INDEX "FinancialCategory_type_idx" ON "FinancialCategory"("type");

-- CreateIndex
CREATE INDEX "FinancialCategory_active_idx" ON "FinancialCategory"("active");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_code_key" ON "CashMovement"("code");

-- CreateIndex
CREATE INDEX "CashMovement_code_idx" ON "CashMovement"("code");

-- CreateIndex
CREATE INDEX "CashMovement_type_idx" ON "CashMovement"("type");

-- CreateIndex
CREATE INDEX "CashMovement_categoryId_idx" ON "CashMovement"("categoryId");

-- CreateIndex
CREATE INDEX "CashMovement_movementDate_idx" ON "CashMovement"("movementDate");

-- CreateIndex
CREATE INDEX "CashMovement_description_idx" ON "CashMovement"("description");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
