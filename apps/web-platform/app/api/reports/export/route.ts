import { NextResponse } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import {
  accountStatusLabels,
  formatDate,
  getClientReportData,
  getFinanceReportData,
  getSalesReportData,
  getStockReportData,
  stockTypeLabels,
} from "@/app/lib/reports";

type CsvRow = Array<string | number | null | undefined>;

const reportNames = {
  sales: "relatorio-vendas",
  finance: "relatorio-financeiro",
  stock: "relatorio-estoque",
  clients: "relatorio-clientes",
};

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(headers: string[], rows: CsvRow[]) {
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\n");
}

function csvResponse(type: keyof typeof reportNames, body: string) {
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportNames[type]}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

async function salesCsv(tenantId: string) {
  const data = await getSalesReportData(tenantId);

  return csv(
    ["origem", "codigo", "cliente", "detalhe", "data", "total"],
    data.recent.map((item) => [
      item.type,
      item.code,
      item.customer,
      item.detail,
      formatDate(item.date),
      item.total,
    ])
  );
}

async function financeCsv(tenantId: string) {
  const data = await getFinanceReportData(tenantId);

  return csv(
    ["tipo", "descricao", "categoria", "data", "valor"],
    data.recentEvents.map((event) => [
      event.type,
      event.description,
      event.category,
      formatDate(event.date),
      event.amount,
    ])
  );
}

async function stockCsv(tenantId: string) {
  const data = await getStockReportData(tenantId);

  const lowStockRows: CsvRow[] = data.lowStockItems.map((item) => [
    "baixo_estoque",
    item.code,
    item.name,
    item.unit,
    item.stockCurrent?.toString(),
    item.stockMinimum?.toString(),
    "",
    "",
  ]);

  const movementRows: CsvRow[] = data.movements.map((movement) => [
    "movimento",
    movement.catalogItem.code,
    movement.catalogItem.name,
    movement.catalogItem.unit,
    movement.quantity.toString(),
    stockTypeLabels[movement.type] ?? movement.type,
    movement.reason,
    formatDate(movement.createdAt),
  ]);

  return csv(
    ["grupo", "codigo", "produto", "unidade", "quantidade_atual", "minimo_ou_tipo", "motivo", "data"],
    [...lowStockRows, ...movementRows]
  );
}

async function clientsCsv(tenantId: string) {
  const data = await getClientReportData(tenantId);

  const topRows: CsvRow[] = data.topClients.map((client) => [
    "ranking",
    client.name,
    client.sales,
    client.orders,
    client.total,
    "",
    "",
  ]);

  const inactiveRows: CsvRow[] = data.inactiveClients.map((client) => [
    "inativo",
    client.name,
    "",
    "",
    "",
    client.status,
    formatDate(client.lastActivity),
  ]);

  return csv(
    ["grupo", "cliente", "vendas", "ordens_servico", "total", "status", "ultimo_movimento"],
    [...topRows, ...inactiveRows]
  );
}

async function accountsCsv(tenantId: string) {
  const data = await getFinanceReportData(tenantId);

  return csv(
    ["tipo", "status", "quantidade", "valor"],
    data.accounts.groups.map((group) => [
      group.type,
      accountStatusLabels[group.status],
      typeof group._count === "object" && group._count ? group._count._all ?? 0 : 0,
      group._sum?.amount?.toString(),
    ])
  );
}

export async function GET(request: Request) {
  const { tenant, response } = await requireTenantOrJson();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (type === "sales") {
    return csvResponse(type, await salesCsv(tenant.tenantId));
  }

  if (type === "finance") {
    return csvResponse(type, await financeCsv(tenant.tenantId));
  }

  if (type === "stock") {
    return csvResponse(type, await stockCsv(tenant.tenantId));
  }

  if (type === "clients") {
    return csvResponse(type, await clientsCsv(tenant.tenantId));
  }

  if (type === "accounts") {
    return csvResponse("finance", await accountsCsv(tenant.tenantId));
  }

  return NextResponse.json(
    { message: "Tipo de relatorio invalido." },
    { status: 400 }
  );
}
