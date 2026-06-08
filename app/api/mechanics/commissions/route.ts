import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { getMechanicCommissionReport } from "./shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const report = await getMechanicCommissionReport({
    period: searchParams.get("period"),
    mechanicName: searchParams.get("mechanicName"),
    status: searchParams.get("status"),
  });

  return Response.json(JSON.parse(JSON.stringify(report)));
}
