import type { NextRequest } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { getMechanicCommissionReport } from "./shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const report = await getMechanicCommissionReport({
    tenantId: tenant.tenantId,
    period: searchParams.get("period"),
    mechanicName: searchParams.get("mechanicName"),
    status: searchParams.get("status"),
  });

  return Response.json(JSON.parse(JSON.stringify(report)));
}
