CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'company',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "cep" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "ibgeCode" TEXT,
    "logoUrl" TEXT,
    "documentFooter" TEXT,
    "commercialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySettings_singletonKey_key" ON "CompanySettings"("singletonKey");
CREATE INDEX "CompanySettings_legalName_idx" ON "CompanySettings"("legalName");
CREATE INDEX "CompanySettings_tradeName_idx" ON "CompanySettings"("tradeName");
CREATE INDEX "CompanySettings_document_idx" ON "CompanySettings"("document");
