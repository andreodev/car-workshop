import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { vehicleService } from "../service/vehicle.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const vehicleController = {
  async list(request: NextRequest) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await vehicleService.list(request);

    return Response.json(result);
  },

  async create(request: NextRequest) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const result = await vehicleService.create(payload);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 201 });
  },

  async findById(_request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const result = await vehicleService.findById(id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },

  async update(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;

    const result = await vehicleService.update(id, payload);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },

  async remove(_request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;

    const result = await vehicleService.remove(id);

    if (isServiceError(result)) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },
};
