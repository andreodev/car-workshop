-- Separate service-order lines by service/product and link product stock movement origin.
CREATE TYPE "ServiceOrderItemType" AS ENUM ('SERVICE', 'PRODUCT');

ALTER TABLE "ServiceOrderItem" ADD COLUMN "type" "ServiceOrderItemType" NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "ServiceOrderItem" ADD COLUMN "catalogItemId" TEXT;

ALTER TABLE "StockMovement" ADD COLUMN "serviceOrderId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "serviceOrderItemId" TEXT;

CREATE INDEX "ServiceOrderItem_catalogItemId_idx" ON "ServiceOrderItem"("catalogItemId");
CREATE INDEX "ServiceOrderItem_type_idx" ON "ServiceOrderItem"("type");
CREATE INDEX "StockMovement_serviceOrderId_idx" ON "StockMovement"("serviceOrderId");
CREATE INDEX "StockMovement_serviceOrderItemId_idx" ON "StockMovement"("serviceOrderItemId");

ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_serviceOrderItemId_fkey" FOREIGN KEY ("serviceOrderItemId") REFERENCES "ServiceOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
