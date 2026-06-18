-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "VehicleFuel" AS ENUM ('GASOLINA', 'ETANOL', 'DIESEL', 'FLEX', 'GNV', 'ELETRICO', 'HIBRIDO');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "version" TEXT,
    "fleet" TEXT,
    "fuel" "VehicleFuel",
    "color" TEXT,
    "chassis" TEXT,
    "renavam" TEXT,
    "engine" TEXT,
    "city" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ATIVO',
    "manufactureYear" INTEGER,
    "modelYear" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateSequence
CREATE SEQUENCE "Vehicle_code_seq";
ALTER TABLE "Vehicle" ALTER COLUMN "code" SET DEFAULT nextval('"Vehicle_code_seq"');
ALTER SEQUENCE "Vehicle_code_seq" OWNED BY "Vehicle"."code";

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");
CREATE INDEX "Vehicle_brand_idx" ON "Vehicle"("brand");
CREATE INDEX "Vehicle_model_idx" ON "Vehicle"("model");
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "Vehicle_code_idx" ON "Vehicle"("code");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
