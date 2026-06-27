CREATE TYPE "EmailDomainStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'VERIFIED');

CREATE TABLE "TenantEmailSettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromName" TEXT,
  "fromAddress" TEXT,
  "replyTo" TEXT,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notificationEmails" TEXT,
  "emailDomain" TEXT,
  "emailDomainStatus" "EmailDomainStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantEmailSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantEmailSettings_tenantId_key" ON "TenantEmailSettings"("tenantId");
CREATE INDEX "TenantEmailSettings_tenantId_idx" ON "TenantEmailSettings"("tenantId");
CREATE INDEX "TenantEmailSettings_emailDomain_idx" ON "TenantEmailSettings"("emailDomain");
CREATE INDEX "TenantEmailSettings_emailDomainStatus_idx" ON "TenantEmailSettings"("emailDomainStatus");

ALTER TABLE "TenantEmailSettings"
ADD CONSTRAINT "TenantEmailSettings_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
