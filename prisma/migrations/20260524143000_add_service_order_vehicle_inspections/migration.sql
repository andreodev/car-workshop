-- CreateEnum
CREATE TYPE "VehicleInspectionStatus" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "ServiceOrderVehicleInspection" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "VehicleInspectionStatus" NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderVehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderVehicleInspectionPhoto" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderVehicleInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrderVehicleInspection_serviceOrderId_key" ON "ServiceOrderVehicleInspection"("serviceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrderVehicleInspection_token_key" ON "ServiceOrderVehicleInspection"("token");

-- CreateIndex
CREATE INDEX "ServiceOrderVehicleInspection_token_idx" ON "ServiceOrderVehicleInspection"("token");

-- CreateIndex
CREATE INDEX "ServiceOrderVehicleInspection_status_idx" ON "ServiceOrderVehicleInspection"("status");

-- CreateIndex
CREATE INDEX "ServiceOrderVehicleInspectionPhoto_inspectionId_idx" ON "ServiceOrderVehicleInspectionPhoto"("inspectionId");

-- AddForeignKey
ALTER TABLE "ServiceOrderVehicleInspection" ADD CONSTRAINT "ServiceOrderVehicleInspection_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderVehicleInspectionPhoto" ADD CONSTRAINT "ServiceOrderVehicleInspectionPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ServiceOrderVehicleInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
