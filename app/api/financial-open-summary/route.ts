import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function decimalToNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [accountGroups, activeServiceOrders] = await prisma.$transaction([
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      where: {
        status: { in: ["ABERTA", "VENCIDA"] },
      },
      orderBy: [{ type: "asc" }, { status: "asc" }],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.serviceOrder.aggregate({
      where: {
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
