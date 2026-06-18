-- Prevent physical ServiceOrder deletion from cascading or unlinking audit-critical records.
ALTER TABLE "ServiceOrderItem" DROP CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey";
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceOrderVehicleInspection" DROP CONSTRAINT "ServiceOrderVehicleInspection_serviceOrderId_fkey";
ALTER TABLE "ServiceOrderVehicleInspection" ADD CONSTRAINT "ServiceOrderVehicleInspection_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Estimate" DROP CONSTRAINT "Estimate_convertedServiceOrderId_fkey";
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_convertedServiceOrderId_fkey" FOREIGN KEY ("convertedServiceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_serviceOrderId_fkey";
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
