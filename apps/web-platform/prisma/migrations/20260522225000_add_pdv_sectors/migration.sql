-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "sectorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE INDEX "Sector_code_idx" ON "Sector"("code");

-- CreateIndex
CREATE INDEX "Sector_name_idx" ON "Sector"("name");

-- CreateIndex
CREATE INDEX "Sector_active_idx" ON "Sector"("active");

-- CreateIndex
CREATE INDEX "Sale_sectorId_idx" ON "Sale"("sectorId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
