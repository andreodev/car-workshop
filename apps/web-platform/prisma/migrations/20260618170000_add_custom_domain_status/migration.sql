CREATE TYPE "CustomDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ERROR');

ALTER TABLE "Tenant"
ADD COLUMN "customDomainVerificationToken" TEXT,
ADD COLUMN "customDomainLastError" TEXT,
ADD COLUMN "customDomainStatus" "CustomDomainStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "Tenant_customDomainStatus_idx" ON "Tenant"("customDomainStatus");
