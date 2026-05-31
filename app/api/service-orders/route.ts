import { serviceOrderController } from "./controllers/service-order.controller";

export const dynamic = "force-dynamic";

export const GET = serviceOrderController.list;
export const POST = serviceOrderController.create;
