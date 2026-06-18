import type { NextRequest } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";

import { renderSaleReceiptPdf } from "./receipt-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const contentDisposition =
    searchParams.get("download") === "1" ? "attachment" : "inline";

  if (response) {
    return response;
  }

  const receipt = await renderSaleReceiptPdf(id, tenant.tenantId);

  if (!receipt) {
    return Response.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  return new Response(receipt.pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${contentDisposition}; filename=${receipt.filename}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
