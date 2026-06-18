import { saleController } from "../controllers/sale.controller";

export const dynamic = "force-dynamic";

export const GET = saleController.findServiceOrderForPdv;
export const POST = saleController.finalizePayment;
export const PATCH = saleController.updateStatus;
