import { saleController } from "./controllers/sale.controller";

export const dynamic = "force-dynamic";

export const GET = saleController.list;
export const POST = saleController.create;
