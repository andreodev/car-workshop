-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CONVERTIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'RASCUNHO',
    "type" TEXT NOT NULL DEFAULT 'SIMPLES',
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "notesInternal" TEXT,
    "notesClient" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "convertedServiceOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_code_key" ON "Estimate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_convertedServiceOrderId_key" ON "Estimate"("convertedServiceOrderId");

-- CreateIndex
CREATE INDEX "Estimate_code_idx" ON "Estimate"("code");

-- CreateIndex
CREATE INDEX "Estimate_clientId_idx" ON "Estimate"("clientId");

-- CreateIndex
CREATE INDEX "Estimate_vehicleId_idx" ON "Estimate"("vehicleId");

-- CreateIndex
CREATE INDEX "Estimate_status_idx" ON "Estimate"("status");

-- CreateIndex
CREATE INDEX "Estimate_validUntil_idx" ON "Estimate"("validUntil");

-- CreateIndex
CREATE INDEX "EstimateItem_estimateId_idx" ON "EstimateItem"("estimateId");

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_convertedServiceOrderId_fkey" FOREIGN KEY ("convertedServiceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
