ALTER TABLE "ServiceOrderItem" ADD COLUMN "mechanicId" TEXT;
ALTER TABLE "EstimateItem" ADD COLUMN "mechanicId" TEXT;

UPDATE "ServiceOrderItem" AS item
SET "mechanicId" = service_order."mechanicId"
FROM "ServiceOrder" AS service_order
WHERE item."serviceOrderId" = service_order."id"
  AND item."mechanicId" IS NULL;

UPDATE "EstimateItem" AS item
SET "mechanicId" = estimate."mechanicId"
FROM "Estimate" AS estimate
WHERE item."estimateId" = estimate."id"
  AND item."mechanicId" IS NULL;

ALTER TABLE "ServiceOrderItem"
  ADD CONSTRAINT "ServiceOrderItem_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EstimateItem"
  ADD CONSTRAINT "EstimateItem_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServiceOrderItem_mechanicId_idx" ON "ServiceOrderItem"("mechanicId");
CREATE INDEX "EstimateItem_mechanicId_idx" ON "EstimateItem"("mechanicId");
