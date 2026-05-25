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
] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
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
    where: { mechanicId: id },
    include: {
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, model: true } },
      items: { select: { type: true, total: true } },
    },
    orderBy: { entryAt: "desc" },
  });

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
  let monthCompletedOrders = 0;
  const commissionRate = mechanic.commissionPercent.div(100);

  const getServiceTotal = (order: (typeof orders)[number]) =>
    order.items.reduce((sum, item) => {
      if (item.type !== "SERVICE") {
        return sum;
      }

      return sum.add(item.total);
    }, new Prisma.Decimal(0));

  orders.forEach((order) => {
    const orderServiceTotal = getServiceTotal(order);
    const bucket = totalsByStatus.get(order.status);
    if (bucket) {
      bucket.count += 1;
      bucket.total = bucket.total.add(order.total);
    }

    if (order.status !== "CANCELADA") {
      totalRevenue = totalRevenue.add(order.total);
      serviceRevenue = serviceRevenue.add(orderServiceTotal);
    }

    if (activeStatuses.includes(order.status as (typeof activeStatuses)[number])) {
      activeRevenue = activeRevenue.add(order.total);
      activeServiceRevenue = activeServiceRevenue.add(orderServiceTotal);
    }

    if (order.status === "FINALIZADA") {
      completedRevenue = completedRevenue.add(order.total);
      completedServiceRevenue = completedServiceRevenue.add(orderServiceTotal);
      if (order.updatedAt >= startOfMonth) {
        monthCompletedOrders += 1;
      }
    }
  });

  const mapOrder = (order: (typeof orders)[number]) => {
    const serviceTotal = getServiceTotal(order);

    return {
      id: order.id,
      code: order.code,
      status: order.status,
      entryAt: order.entryAt,
      estimatedAt: order.estimatedAt,
      updatedAt: order.updatedAt,
      total: order.total,
      serviceTotal,
      commissionTotal: serviceTotal.mul(commissionRate),
      location: order.location,
      client: order.client,
      vehicle: order.vehicle,
    };
  };

  const report = {
    mechanic,
    summary: {
      totalOrders: orders.length,
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
    },
    statusSummary: serviceOrderStatuses.map((status) => {
      const bucket = totalsByStatus.get(status);
      return {
        status,
        count: bucket?.count ?? 0,
        total: decimalToString(bucket?.total ?? new Prisma.Decimal(0)),
      };
    }),
    activeOrders: orders
      .filter((order) => activeStatuses.includes(order.status as (typeof activeStatuses)[number]))
      .map(mapOrder),
    recentOrders: orders.slice(0, 30).map(mapOrder),
  };

  return Response.json(JSON.parse(JSON.stringify(report)));
}
