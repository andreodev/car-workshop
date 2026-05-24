CREATE TABLE "Mechanic" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mechanic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mechanic_code_key" ON "Mechanic"("code");
CREATE UNIQUE INDEX "Mechanic_name_key" ON "Mechanic"("name");
CREATE INDEX "Mechanic_code_idx" ON "Mechanic"("code");
CREATE INDEX "Mechanic_name_idx" ON "Mechanic"("name");
CREATE INDEX "Mechanic_active_idx" ON "Mechanic"("active");
