CREATE TABLE "Customization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customization_tenantId_key" ON "Customization"("tenantId");
CREATE INDEX "Customization_tenantId_idx" ON "Customization"("tenantId");

ALTER TABLE "Customization"
ADD CONSTRAINT "Customization_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
