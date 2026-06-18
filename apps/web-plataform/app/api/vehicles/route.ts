import { vehicleController } from "./controllers/vehicle.controller";

export const dynamic = "force-dynamic";

export const GET = vehicleController.list;
export const POST = vehicleController.create;