import { serviceOrderController } from "../controllers/service-order.controller";

export const dynamic = "force-dynamic";

export const GET = serviceOrderController.findById;
export const PUT = serviceOrderController.update;
export const PATCH = serviceOrderController.updateStatus;
export const DELETE = serviceOrderController.remove;
