import type { NextRequest } from "next/server";

import { vehicleInspectionService } from "../services/vehicle-inspection.service";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function errorResponse(result: { error: string; status: number }) {
  return Response.json({ error: result.error }, { status: result.status });
}

export const vehicleInspectionController = {
  async findByToken(_request: NextRequest, { params }: RouteContext) {
    const { token } = await params;
    const result = await vehicleInspectionService.findByToken(token);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  },

  async complete(request: NextRequest, { params }: RouteContext) {
    const { token } = await params;
    const formData = await request.formData();
    const result = await vehicleInspectionService.complete(token, formData);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  },
};
