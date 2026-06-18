import { clientController } from "../controllers/client.controller";

export const dynamic = "force-dynamic";

export const GET = clientController.findById;
export const PUT = clientController.update;
export const DELETE = clientController.remove;
