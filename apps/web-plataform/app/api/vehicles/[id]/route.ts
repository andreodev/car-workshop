import { vehicleController } from "../controllers/vehicle.controller";


export const dynamic = "force-dynamic";

export const GET = vehicleController.findById;
export const PUT = vehicleController.update;
export const DELETE = vehicleController.remove;