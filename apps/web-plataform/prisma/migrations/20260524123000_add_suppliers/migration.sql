CREATE TYPE "SupplierPersonType" AS ENUM ('FISICA', 'JURIDICA');
CREATE TYPE "SupplierOrderStatus" AS ENUM ('ABERTO', 'RECEBIDO', 'CANCELADO');

CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "personType" "SupplierPersonType" NOT NULL DEFAULT 'FISICA',
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "contact" TEXT,
    "productLine" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "phone3" TEXT,
    "phone4" TEXT,
    "email" TEXT,
    "website" TEXT,
    "cep" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "bank" TEXT,
    "account" TEXT,
    "agency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierOrder" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'ABERTO',
    "supplierId" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "forecastAt" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT,
    "observation" TEXT,
    "internalDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX "Supplier_code_idx" ON "Supplier"("code");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX "Supplier_cpf_idx" ON "Supplier"("cpf");
CREATE INDEX "Supplier_email_idx" ON "Supplier"("email");
CREATE INDEX "Supplier_productLine_idx" ON "Supplier"("productLine");

CREATE UNIQUE INDEX "SupplierOrder_code_key" ON "SupplierOrder"("code");
CREATE INDEX "SupplierOrder_code_idx" ON "SupplierOrder"("code");
CREATE INDEX "SupplierOrder_supplierId_idx" ON "SupplierOrder"("supplierId");
CREATE INDEX "SupplierOrder_employee_idx" ON "SupplierOrder"("employee");
CREATE INDEX "SupplierOrder_forecastAt_idx" ON "SupplierOrder"("forecastAt");
CREATE INDEX "SupplierOrder_status_idx" ON "SupplierOrder"("status");

ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
