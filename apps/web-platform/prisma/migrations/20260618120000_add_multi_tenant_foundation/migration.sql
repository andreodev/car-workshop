-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ServiceOrder" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ServiceOrderVehicleInspection" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ServiceOrderItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Estimate" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EstimateItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Sector" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Mechanic" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SupplierOrder" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FinancialCategory" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CashMovement" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SalePayment" ADD COLUMN "tenantId" TEXT;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "customDomain" TEXT,
    "customDomainVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterAdmin_pkey" PRIMARY KEY ("id")
);

-- Backfill
INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('tenant_default', 'Oficina Principal', 'oficina-principal', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "TenantUser" ("id", "tenantId", "userId", "role", "isActive", "createdAt", "updatedAt")
SELECT
    concat('tenant_user_', "id"),
    'tenant_default',
    "id",
    'OWNER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

UPDATE "Client" SET "tenantId" = 'tenant_default';
UPDATE "Vehicle" SET "tenantId" = 'tenant_default';
UPDATE "ServiceOrder" SET "tenantId" = 'tenant_default';
UPDATE "ServiceOrderVehicleInspection" SET "tenantId" = 'tenant_default';
UPDATE "ServiceOrderItem" SET "tenantId" = 'tenant_default';
UPDATE "Estimate" SET "tenantId" = 'tenant_default';
UPDATE "EstimateItem" SET "tenantId" = 'tenant_default';
UPDATE "CatalogItem" SET "tenantId" = 'tenant_default';
UPDATE "Sector" SET "tenantId" = 'tenant_default';
UPDATE "Mechanic" SET "tenantId" = 'tenant_default';
UPDATE "Supplier" SET "tenantId" = 'tenant_default';
UPDATE "SupplierOrder" SET "tenantId" = 'tenant_default';
UPDATE "Sale" SET "tenantId" = 'tenant_default';
UPDATE "SaleItem" SET "tenantId" = 'tenant_default';
UPDATE "StockMovement" SET "tenantId" = 'tenant_default';
UPDATE "FinancialAccount" SET "tenantId" = 'tenant_default';
UPDATE "FinancialCategory" SET "tenantId" = 'tenant_default';
UPDATE "CashMovement" SET "tenantId" = 'tenant_default';
UPDATE "CompanySettings" SET "tenantId" = 'tenant_default';
UPDATE "SalePayment" SET "tenantId" = 'tenant_default';

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_customDomain_idx" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "TenantUser_userId_idx" ON "TenantUser"("userId");
CREATE INDEX "TenantUser_tenantId_role_idx" ON "TenantUser"("tenantId", "role");
CREATE INDEX "TenantUser_tenantId_isActive_idx" ON "TenantUser"("tenantId", "isActive");
CREATE UNIQUE INDEX "TenantUser_tenantId_userId_key" ON "TenantUser"("tenantId", "userId");
CREATE UNIQUE INDEX "MasterAdmin_userId_key" ON "MasterAdmin"("userId");
CREATE INDEX "MasterAdmin_tenantId_idx" ON "MasterAdmin"("tenantId");
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");
CREATE UNIQUE INDEX "Vehicle_tenantId_code_key" ON "Vehicle"("tenantId", "code");
CREATE INDEX "ServiceOrder_tenantId_idx" ON "ServiceOrder"("tenantId");
CREATE UNIQUE INDEX "ServiceOrder_tenantId_code_key" ON "ServiceOrder"("tenantId", "code");
CREATE INDEX "ServiceOrderVehicleInspection_tenantId_idx" ON "ServiceOrderVehicleInspection"("tenantId");
CREATE INDEX "ServiceOrderItem_tenantId_idx" ON "ServiceOrderItem"("tenantId");
CREATE INDEX "Estimate_tenantId_idx" ON "Estimate"("tenantId");
CREATE UNIQUE INDEX "Estimate_tenantId_code_key" ON "Estimate"("tenantId", "code");
CREATE INDEX "EstimateItem_tenantId_idx" ON "EstimateItem"("tenantId");
CREATE INDEX "CatalogItem_tenantId_idx" ON "CatalogItem"("tenantId");
CREATE UNIQUE INDEX "CatalogItem_tenantId_code_key" ON "CatalogItem"("tenantId", "code");
CREATE INDEX "Sector_tenantId_idx" ON "Sector"("tenantId");
CREATE UNIQUE INDEX "Sector_tenantId_code_key" ON "Sector"("tenantId", "code");
CREATE UNIQUE INDEX "Sector_tenantId_name_key" ON "Sector"("tenantId", "name");
CREATE INDEX "Mechanic_tenantId_idx" ON "Mechanic"("tenantId");
CREATE UNIQUE INDEX "Mechanic_tenantId_code_key" ON "Mechanic"("tenantId", "code");
CREATE UNIQUE INDEX "Mechanic_tenantId_name_key" ON "Mechanic"("tenantId", "name");
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE UNIQUE INDEX "Supplier_tenantId_code_key" ON "Supplier"("tenantId", "code");
CREATE INDEX "SupplierOrder_tenantId_idx" ON "SupplierOrder"("tenantId");
CREATE UNIQUE INDEX "SupplierOrder_tenantId_code_key" ON "SupplierOrder"("tenantId", "code");
CREATE INDEX "Sale_tenantId_idx" ON "Sale"("tenantId");
CREATE UNIQUE INDEX "Sale_tenantId_code_key" ON "Sale"("tenantId", "code");
CREATE INDEX "SaleItem_tenantId_idx" ON "SaleItem"("tenantId");
CREATE INDEX "StockMovement_tenantId_idx" ON "StockMovement"("tenantId");
CREATE INDEX "FinancialAccount_tenantId_idx" ON "FinancialAccount"("tenantId");
CREATE UNIQUE INDEX "FinancialAccount_tenantId_code_key" ON "FinancialAccount"("tenantId", "code");
CREATE INDEX "FinancialCategory_tenantId_idx" ON "FinancialCategory"("tenantId");
CREATE UNIQUE INDEX "FinancialCategory_tenantId_code_key" ON "FinancialCategory"("tenantId", "code");
CREATE UNIQUE INDEX "FinancialCategory_tenantId_name_key" ON "FinancialCategory"("tenantId", "name");
CREATE INDEX "CashMovement_tenantId_idx" ON "CashMovement"("tenantId");
CREATE UNIQUE INDEX "CashMovement_tenantId_code_key" ON "CashMovement"("tenantId", "code");
CREATE UNIQUE INDEX "CompanySettings_tenantId_key" ON "CompanySettings"("tenantId");
CREATE INDEX "CompanySettings_tenantId_idx" ON "CompanySettings"("tenantId");
CREATE INDEX "SalePayment_tenantId_idx" ON "SalePayment"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasterAdmin" ADD CONSTRAINT "MasterAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasterAdmin" ADD CONSTRAINT "MasterAdmin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderVehicleInspection" ADD CONSTRAINT "ServiceOrderVehicleInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mechanic" ADD CONSTRAINT "Mechanic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
