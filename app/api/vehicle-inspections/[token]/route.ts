import { vehicleInspectionController } from "../controllers/vehicle-inspection.controller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = vehicleInspectionController.findByToken;
export const POST = vehicleInspectionController.complete;
