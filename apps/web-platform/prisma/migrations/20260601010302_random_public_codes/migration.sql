-- AlterTable
ALTER TABLE "CashMovement" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CashMovement', 'code');

-- AlterTable
ALTER TABLE "CatalogItem" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('CatalogItem', 'code');

-- AlterTable
ALTER TABLE "Estimate" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Estimate', 'code');

-- AlterTable
ALTER TABLE "FinancialAccount" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialAccount', 'code');

-- AlterTable
ALTER TABLE "FinancialCategory" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('FinancialCategory', 'code');

-- AlterTable
ALTER TABLE "Mechanic" ALTER COLUMN "code" SET DEFAULT public.generate_public_code('Mechanic', 'code');

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
