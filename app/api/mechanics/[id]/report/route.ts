import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const activeStatuses = ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECAS", "IMPEDIDA"] as const;
const serviceOrderStatuses = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
  "FINALIZADA",
  "CANCELADA",
  "PAGA",
] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function accountAmount(account: { amount: Prisma.Decimal; paidAmount: Prisma.Decimal | null }) {
  return account.paidAmount ?? account.amount;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const mechanic = await prisma.mechanic.findUnique({ where: { id } });

  if (!mechanic) {
    return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
  }

  const orders = await prisma.serviceOrder.findMany({
    where: {
      items: {
        some: {
          mechanicId: id,
          type: "SERVICE",
        },
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      items: {
        where: {
          mechanicId: id,
          type: "SERVICE",
        },
        select: {
          id: true,
          type: true,
          description: true,
          quantity: true,
          unitPrice: true,
          discount: true,
          total: true,
          commissionBase: true,
          catalogItem: { select: { id: true, code: true, name: true, type: true } },
          sector: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { entryAt: "desc" },
  });

  const orderDocumentNumbers = orders.map((order) => `OS-${order.code}`);
  const commissionAccounts = orderDocumentNumbers.length
    ? await prisma.financialAccount.findMany({
        where: {
          type: "PAGAR",
          category: "Comissão mecânico",
          counterparty: mechanic.name,
          documentNumber: { in: orderDocumentNumbers },
          status: { not: "CANCELADA" },
        },
        select: {
          id: true,
          code: true,
          status: true,
          description: true,
          documentNumber: true,
          dueDate: true,
          paymentDate: true,
          amount: true,
          paidAmount: true,
          paymentMethod: true,
          notes: true,
        },
        orderBy: [{ dueDate: "desc" }, { code: "desc" }],
      })
    : [];

  const commissionAccountsByDocument = new Map<string, typeof commissionAccounts>();

  for (const account of commissionAccounts) {
    if (!account.documentNumber) {
      continue;
    }

    const accounts = commissionAccountsByDocument.get(account.documentNumber) ?? [];
    accounts.push(account);
    commissionAccountsByDocument.set(account.documentNumber, accounts);
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalsByStatus = new Map<
    (typeof serviceOrderStatuses)[number],
    { count: number; total: Prisma.Decimal }
  >(
    serviceOrderStatuses.map((status) => [
      status,
      { count: 0, total: new Prisma.Decimal(0) },
    ])
  );

  let totalRevenue = new Prisma.Decimal(0);
  let activeRevenue = new Prisma.Decimal(0);
  let completedRevenue = new Prisma.Decimal(0);
  let serviceRevenue = new Prisma.Decimal(0);
  let activeServiceRevenue = new Prisma.Decimal(0);
  let completedServiceRevenue = new Prisma.Decimal(0);
  let pendingCommissionTotal = new Prisma.Decimal(0);
  let paidCommissionTotal = new Prisma.Decimal(0);
  let overdueCommissionTotal = new Prisma.Decimal(0);
  let monthCompletedOrders = 0;
  let serviceItemsCount = 0;
  const commissionRate = mechanic.commissionPercent.div(100);

  const getAssignedServiceTotal = (order: (typeof orders)[number]) =>
    order.items.reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));

  const getCommissionBaseTotal = (order: (typeof orders)[number]) =>
    order.items.reduce((sum, item) => {
      if (item.commissionBase !== null && item.commissionBase !== undefined) {
        return sum.add(item.commissionBase);
      }

      if (item.type !== "SERVICE") {
        return sum;
      }

      return sum.add(item.total);
    }, new Prisma.Decimal(0));

  orders.forEach((order) => {
    const assignedServiceTotal = getAssignedServiceTotal(order);
    const orderServiceTotal = getCommissionBaseTotal(order);
    const bucket = totalsByStatus.get(order.status);
    serviceItemsCount += order.items.length;

    if (bucket) {
      bucket.count += 1;
      bucket.total = bucket.total.add(assignedServiceTotal);
    }

    if (order.status !== "CANCELADA") {
      totalRevenue = totalRevenue.add(assignedServiceTotal);
      serviceRevenue = serviceRevenue.add(orderServiceTotal);
    }

    if (activeStatuses.includes(order.status as (typeof activeStatuses)[number])) {
      activeRevenue = activeRevenue.add(assignedServiceTotal);
      activeServiceRevenue = activeServiceRevenue.add(orderServiceTotal);
    }

    if (order.status === "FINALIZADA") {
      completedRevenue = completedRevenue.add(assignedServiceTotal);
      completedServiceRevenue = completedServiceRevenue.add(orderServiceTotal);
      if (order.updatedAt >= startOfMonth) {
        monthCompletedOrders += 1;
      }
    }
  });

  for (const account of commissionAccounts) {
    const amount = accountAmount(account);

    if (account.status === "PAGA") {
      paidCommissionTotal = paidCommissionTotal.add(amount);
      continue;
    }

    if (account.status === "VENCIDA") {
      overdueCommissionTotal = overdueCommissionTotal.add(amount);
    }

    if (account.status === "ABERTA" || account.status === "VENCIDA") {
      pendingCommissionTotal = pendingCommissionTotal.add(amount);
    }
  }

  const mapOrder = (order: (typeof orders)[number]) => {
    const assignedServiceTotal = getAssignedServiceTotal(order);
    const serviceTotal = getCommissionBaseTotal(order);
    const orderCommissionAccounts =
      commissionAccountsByDocument.get(`OS-${order.code}`) ?? [];

    return {
      id: order.id,
      code: order.code,
      status: order.status,
      entryAt: order.entryAt,
      estimatedAt: order.estimatedAt,
      updatedAt: order.updatedAt,
      total: assignedServiceTotal,
      serviceTotal,
      commissionTotal: serviceTotal.mul(commissionRate),
      location: order.location,
      client: order.client,
      vehicle: order.vehicle,
      items: order.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: decimalToString(item.unitPrice),
        discount: decimalToString(item.discount),
        total: decimalToString(item.total),
        commissionBase: decimalToString(item.commissionBase ?? item.total),
        catalogItem: item.catalogItem,
        sector: item.sector,
      })),
      commissionAccounts: orderCommissionAccounts.map((account) => ({
        id: account.id,
        code: account.code,
        status: account.status,
        description: account.description,
        documentNumber: account.documentNumber,
        dueDate: account.dueDate,
        paymentDate: account.paymentDate,
        amount: decimalToString(account.amount),
        paidAmount: account.paidAmount ? decimalToString(account.paidAmount) : null,
        paymentMethod: account.paymentMethod,
        notes: account.notes,
      })),
    };
  };

  const mappedOrders = orders.map(mapOrder);

  const report = {
    mechanic,
    summary: {
      totalOrders: orders.length,
      serviceItemsCount,
      activeOrders: orders.filter((order) =>
        activeStatuses.includes(order.status as (typeof activeStatuses)[number])
      ).length,
      completedOrders: totalsByStatus.get("FINALIZADA")?.count ?? 0,
      blockedOrders: totalsByStatus.get("IMPEDIDA")?.count ?? 0,
      waitingPartsOrders: totalsByStatus.get("AGUARDANDO_PECAS")?.count ?? 0,
      monthCompletedOrders,
      totalRevenue: decimalToString(totalRevenue),
      activeRevenue: decimalToString(activeRevenue),
      completedRevenue: decimalToString(completedRevenue),
      serviceRevenue: decimalToString(serviceRevenue),
      activeServiceRevenue: decimalToString(activeServiceRevenue),
      completedServiceRevenue: decimalToString(completedServiceRevenue),
      commissionPercent: decimalToString(mechanic.commissionPercent),
      commissionTotal: decimalToString(serviceRevenue.mul(commissionRate)),
      completedCommissionTotal: decimalToString(completedServiceRevenue.mul(commissionRate)),
      generatedCommissionTotal: decimalToString(
        commissionAccounts.reduce(
          (sum, account) => sum.add(account.amount),
          new Prisma.Decimal(0)
        )
      ),
      pendingCommissionTotal: decimalToString(pendingCommissionTotal),
      paidCommissionTotal: decimalToString(paidCommissionTotal),
      overdueCommissionTotal: decimalToString(overdueCommissionTotal),
      commissionAccountsCount: commissionAccounts.length,
    },
    statusSummary: serviceOrderStatuses.map((status) => {
      const bucket = totalsByStatus.get(status);
      return {
        status,
        count: bucket?.count ?? 0,
        total: decimalToString(bucket?.total ?? new Prisma.Decimal(0)),
      };
    }),
    activeOrders: mappedOrders.filter((order) =>
      activeStatuses.includes(order.status as (typeof activeStatuses)[number])
    ),
    recentOrders: mappedOrders,
    recentItems: mappedOrders.flatMap((order) =>
      order.items.map((item) => ({
        ...item,
        order: {
          id: order.id,
          code: order.code,
          status: order.status,
          entryAt: order.entryAt,
          client: order.client,
          vehicle: order.vehicle,
        },
      }))
    ),
  };

  return Response.json(JSON.parse(JSON.stringify(report)));
}
