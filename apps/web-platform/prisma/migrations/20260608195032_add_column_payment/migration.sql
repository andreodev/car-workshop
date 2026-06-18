/*
  Warnings:

  - You are about to drop the column `sectorId` on the `Estimate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Estimate" DROP CONSTRAINT "Estimate_sectorId_fkey";

-- DropIndex
DROP INDEX "Estimate_sectorId_idx";

-- AlterTable
ALTER TABLE "CashMovement" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CashMovement', 'code');

-- AlterTable
ALTER TABLE "CatalogItem" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CatalogItem', 'code');

-- AlterTable
ALTER TABLE "Estimate" DROP COLUMN "sectorId",
ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Estimate', 'code');

-- AlterTable
ALTER TABLE "FinancialAccount" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialAccount', 'code');

-- AlterTable
ALTER TABLE "FinancialCategory" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialCategory', 'code');

-- AlterTable
ALTER TABLE "Mechanic" ADD COLUMN IF NOT EXISTS "paymentKey" TEXT,
ADD COLUMN IF NOT EXISTS "paymentKeyHolder" TEXT,
ADD COLUMN IF NOT EXISTS "paymentBank" TEXT,
ADD COLUMN IF NOT EXISTS "paymentKeyType" TEXT,
ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Mechanic', 'code');

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Sale', 'code');

-- AlterTable
ALTER TABLE "Sector" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Sector', 'code');

-- AlterTable
ALTER TABLE "ServiceOrder" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('ServiceOrder', 'code');

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Supplier', 'code');

-- AlterTable
ALTER TABLE "SupplierOrder" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('SupplierOrder', 'code');

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Vehicle', 'code');
