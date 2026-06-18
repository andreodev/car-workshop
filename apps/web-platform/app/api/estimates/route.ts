import { estimateController } from "./controllers/estimate.controller";

export const dynamic = "force-dynamic";

export const GET = estimateController.list;
export const POST = estimateController.create;
