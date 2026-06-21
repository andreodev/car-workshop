import type { CatalogItem, Prisma } from "@prisma/client";
import type { DashboardPeriod } from "../types/dashboard.types";
import { getDashboardPeriodRange, getSupplierDateRanges } from "../utils/dashboard.date";
import { prisma } from "@/app/lib/prisma";
import { activeServiceOrderStatuses, openEstimateStatuses } from "../utils/dashboard.constants";

export async function getDashboardData(period: DashboardPeriod) {
  const { start, end, todayStart, label: periodLabel } =
    getDashboardPeriodRange(period);
  const { nextWeekEnd } = getSupplierDateRanges();
  const periodFilter = { gte: start, lt: end };
  const serviceOrderPeriodWhere: Prisma.ServiceOrderWhereInput = {
    entryAt: periodFilter,
  };
  const estimatePeriodWhere: Prisma.EstimateWhereInput = {
    createdAt: periodFilter,
  };

  const [
    clientCount,
    vehicleCount,
    mechanicCount,
    serviceOrderGroups,
    estimateGroups,
    periodSales,
    recentServiceOrders,
    recentEstimates,
    financialGroups,
    overdueFinancial,
    lowStockItems,
    openSupplierOrders,
    urgentSupplierOrders,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ATIVO" } }),
    prisma.vehicle.count({ where: { status: "ATIVO" } }),
    prisma.mechanic.count({ where: { active: true } }),
    prisma.serviceOrder.groupBy({
      by: ["status"],
      where: serviceOrderPeriodWhere,
      orderBy: { status: "asc" },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      where: estimatePeriodWhere,
      orderBy: { status: "asc" },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        status: "CONCLUIDA",
        createdAt: periodFilter,
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.serviceOrder.findMany({
      where: {
        ...serviceOrderPeriodWhere,
        status: { in: activeServiceOrderStatuses },
      },
      include: {
        client: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        mechanic: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { code: "desc" }],
      take: 7,
    }),
    prisma.estimate.findMany({
      where: {
        ...estimatePeriodWhere,
        status: { in: openEstimateStatuses },
      },
      include: {
        client: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, model: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { code: "desc" }],
      take: 5,
    }),
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      orderBy: [{ type: "asc" }, { status: "asc" }],
      where: {
        dueDate: periodFilter,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financialAccount.aggregate({
      where: {
        status: { in: ["ABERTA", "VENCIDA"] },
        dueDate: { lt: todayStart },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<
      Pick<
        CatalogItem,
        "id" | "code" | "name" | "stockCurrent" | "stockMinimum" | "unit"
      >[]
    >`
      SELECT
        "id",
        "code",
        "name",
        "stockCurrent",
        "stockMinimum",
        "unit"
      FROM "CatalogItem"
      WHERE
        "active" = true
        AND "type" = ${"PRODUTO"}::"CatalogItemType"
        AND "stockCurrent" IS NOT NULL
        AND "stockMinimum" IS NOT NULL
        AND "stockCurrent" <= "stockMinimum"
      ORDER BY "name" ASC
      LIMIT 5
    `,
    prisma.supplierOrder.count({
      where: { status: "ABERTO" },
    }),
    prisma.supplierOrder.findMany({
      where: {
        status: "ABERTO",
        forecastAt: { lte: nextWeekEnd },
      },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ forecastAt: "asc" }, { code: "desc" }],
      take: 5,
    }),
  ]);

  return {
    clientCount,
    vehicleCount,
    mechanicCount,
    serviceOrderGroups,
    estimateGroups,
    periodSales,
    recentServiceOrders,
    recentEstimates,
    financialGroups,
    overdueFinancial,
    lowStockItems,
    openSupplierOrders,
    urgentSupplierOrders,
    period,
    periodLabel,
  };
}