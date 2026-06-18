import { getServerAuthSession } from "@/app/lib/auth-server";

import { renderSaleReceiptPdf } from "./receipt-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const contentDisposition =
    searchParams.get("download") === "1" ? "attachment" : "inline";

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const receipt = await renderSaleReceiptPdf(id);

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
