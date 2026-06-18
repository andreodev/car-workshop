import { clientController } from "./controllers/client.controller";

export const dynamic = "force-dynamic";

export const GET = clientController.list;
export const POST = clientController.create;
