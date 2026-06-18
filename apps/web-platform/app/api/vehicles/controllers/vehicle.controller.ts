import type { NextRequest } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { vehicleService } from "../service/vehicle.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const vehicleController = {
  async list(request: NextRequest) {
    const { tenant, response } = await requireTenantOrJson(request);

    if (response) {
      return response;
    }

    const result = await vehicleService.list(request, tenant.tenantId);

    return Response.json(result);
  },

  async create(request: NextRequest) {
    const { tenant, response } = await requireTenantOrJson(request);

    if (response) {
      return response;
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const result = await vehicleService.create(payload, tenant.tenantId);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, { status: 201 });
  },

  async findById(request: NextRequest, { params }: RouteContext) {
    const { tenant, response } = await requireTenantOrJson(request);

    if (response) {
      return response;
    }

    const { id } = await params;
    const result = await vehicleService.findById(id, tenant.tenantId);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },

  async update(request: NextRequest, { params }: RouteContext) {
    const { tenant, response } = await requireTenantOrJson(request);

    if (response) {
      return response;
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;

    const result = await vehicleService.update(id, payload, tenant.tenantId);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },

  async remove(request: NextRequest, { params }: RouteContext) {
    const { tenant, response } = await requireTenantOrJson(request);

    if (response) {
      return response;
    }

    const { id } = await params;

    const result = await vehicleService.remove(id, tenant.tenantId);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  },
};
