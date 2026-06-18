import { estimateController } from "../controllers/estimate.controller";

export const dynamic = "force-dynamic";

export const GET = estimateController.findById;
export const PUT = estimateController.update;
export const PATCH = estimateController.updateStatus;
export const DELETE = estimateController.remove;
