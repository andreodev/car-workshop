import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function decimalToNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const [accountGroups, activeServiceOrders] = await prisma.$transaction([
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      where: {
        tenantId: tenant.tenantId,
        status: { in: ["ABERTA", "VENCIDA"] },
      },
      orderBy: [{ type: "asc" }, { status: "asc" }],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.serviceOrder.aggregate({
      where: {
        tenantId: tenant.tenantId,
        status: { notIn: ["FINALIZADA", "CANCELADA", "PAGA"] },
        total: { gt: new Prisma.Decimal(0) },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const accountReceivableOpen = accountGroups
    .filter((group) => group.type === "RECEBER")
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
  const payableOpen = accountGroups
    .filter((group) => group.type === "PAGAR")
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
  const activeServiceOrdersReceivable = decimalToNumber(activeServiceOrders._sum.total);
  const receivableOpen = accountReceivableOpen + activeServiceOrdersReceivable;

  return Response.json({
    receivableOpen,
    payableOpen,
    openBalance: receivableOpen - payableOpen,
    accountReceivableOpen,
    activeServiceOrdersReceivable,
    activeServiceOrdersCount: activeServiceOrders._count._all,
  });
}
