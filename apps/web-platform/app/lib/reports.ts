import type {
  CashMovementType,
  FinancialAccountStatus,
  FinancialAccountType,
} from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const integerFormatter = new Intl.NumberFormat("pt-BR");

export const stockTypeLabels: Record<string, string> = {
  ENTRADA: "Entradas",
  SAIDA: "Saidas",
  ESTORNO: "Estornos",
  AJUSTE: "Ajustes",
};

export const accountStatusLabels: Record<FinancialAccountStatus, string> = {
  ABERTA: "Abertas",
  PAGA: "Pagas",
  VENCIDA: "Vencidas",
  CANCELADA: "Canceladas",
};

type CashEvent = {
  type: CashMovementType;
  amount: number;
  date: Date;
  category: string;
  description: string;
};

export function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: unknown) {
  return currencyFormatter.format(decimalToNumber(value));
}

export function formatInteger(value: number) {
  return integerFormatter.format(value);
}

export function formatQuantity(value: unknown) {
  return decimalToNumber(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getDateRanges() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const weekStart = new Date(todayStart);
  const day = weekStart.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + distanceFromMonday);

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const inactiveSince = new Date(todayStart);
  inactiveSince.setDate(inactiveSince.getDate() - 90);

  return {
    todayStart,
    tomorrowStart,
    weekStart,
    nextWeekStart,
    monthStart,
    nextMonthStart,
    inactiveSince,
  };
}

export function groupCount(group: { _count?: true | { _all?: number | null } | null }) {
  return typeof group._count === "object" && group._count ? group._count._all ?? 0 : 0;
}

function isInRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function sumEvents(events: CashEvent[], type: CashMovementType, start?: Date, end?: Date) {
  return events
    .filter((event) => {
      if (event.type !== type) return false;
      if (start && event.date < start) return false;
      if (end && event.date >= end) return false;
      return true;
    })
    .reduce((total, event) => total + event.amount, 0);
}

function accountAmount(
  groups: Array<{
    type: FinancialAccountType;
    status: FinancialAccountStatus;
    _sum?: { amount?: unknown } | null;
  }>,
  type: FinancialAccountType,
  statuses: FinancialAccountStatus[]
) {
  return groups
    .filter((group) => group.type === type && statuses.includes(group.status))
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
}

function latestDate(values: Array<Date | null | undefined>) {
  const timestamps = values
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}

function expenseBucketLabel(event: CashEvent) {
  const text = `${event.category} ${event.description}`.toLowerCase();

  if (["fornecedor", "pedido", "compra"].some((word) => text.includes(word))) {
    return "Fornecedor";
  }

  if (["aluguel", "estrutura", "imovel"].some((word) => text.includes(word))) {
    return "Aluguel";
  }

  if (["funcionario", "salario", "folha"].some((word) => text.includes(word))) {
    return "Funcionario";
  }

  if (["peca", "pecas", "oleo", "filtro"].some((word) => text.includes(word))) {
    return "Pecas";
  }

  return "Outras";
}

export async function getSalesReportData(tenantId: string) {
  const { monthStart, nextMonthStart } = getDateRanges();

  const [serviceOrders, saleItems, sales, recentSales, recentServiceOrders] =
    await prisma.$transaction([
      prisma.serviceOrder.aggregate({
        where: {
          tenantId,
          status: "FINALIZADA",
          entryAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: {
            tenantId,
            status: "CONCLUIDA",
            createdAt: { gte: monthStart, lt: nextMonthStart },
          },
        },
        select: {
          total: true,
          quantity: true,
          catalogItem: { select: { type: true } },
        },
      }),
      prisma.sale.aggregate({
        where: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.sale.findMany({
        where: { status: "CONCLUIDA", tenantId },
        select: {
          id: true,
          code: true,
          total: true,
          createdAt: true,
          client: { select: { name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { code: "desc" }],
        take: 12,
      }),
      prisma.serviceOrder.findMany({
        where: { status: "FINALIZADA", tenantId },
        select: {
          id: true,
          code: true,
          total: true,
          entryAt: true,
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
        },
        orderBy: [{ entryAt: "desc" }, { code: "desc" }],
        take: 12,
      }),
    ]);

  const products = saleItems.filter((item) => item.catalogItem?.type === "PRODUTO");
  const services = saleItems.filter((item) => item.catalogItem?.type === "SERVICO");

  return {
    period: { monthStart, nextMonthStart },
    cards: {
      serviceOrdersTotal: decimalToNumber(serviceOrders._sum.total),
      serviceOrdersCount: serviceOrders._count._all,
      pdvTotal: decimalToNumber(sales._sum.total),
      pdvCount: sales._count._all,
      productsTotal: products.reduce((sum, item) => sum + decimalToNumber(item.total), 0),
      productsQuantity: products.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0),
      servicesTotal: services.reduce((sum, item) => sum + decimalToNumber(item.total), 0),
      servicesQuantity: services.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0),
    },
    recent: [
      ...recentSales.map((sale) => ({
        id: `sale-${sale.id}`,
        type: "PDV",
        code: sale.code,
        date: sale.createdAt,
        total: decimalToNumber(sale.total),
        customer: sale.client?.name ?? "Cliente avulso",
        detail: "Venda",
      })),
      ...recentServiceOrders.map((order) => ({
        id: `order-${order.id}`,
        type: "OS",
        code: order.code,
        date: order.entryAt,
        total: decimalToNumber(order.total),
        customer: order.client.name,
        detail: [order.vehicle.plate, order.vehicle.model].filter(Boolean).join(" - "),
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 12),
  };
}

export async function getFinanceReportData(tenantId: string) {
  const ranges = getDateRanges();
  const { monthStart, nextMonthStart } = ranges;

  const [accountGroups, cashMovements, fallbackSales, fallbackPaidAccounts] =
    await prisma.$transaction([
      prisma.financialAccount.groupBy({
        by: ["type", "status"],
        where: { status: { not: "CANCELADA" }, tenantId },
        orderBy: [{ type: "asc" }, { status: "asc" }],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.cashMovement.findMany({
        where: { movementDate: { lt: nextMonthStart }, tenantId },
        select: {
          type: true,
          amount: true,
          movementDate: true,
          description: true,
          category: { select: { name: true } },
        },
      }),
      prisma.sale.findMany({
        where: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { lt: nextMonthStart },
          cashMovements: { none: {} },
        },
        select: { code: true, total: true, createdAt: true },
      }),
      prisma.financialAccount.findMany({
        where: {
          tenantId,
          status: "PAGA",
          cashMovements: { none: {} },
          OR: [
            { paymentDate: { lt: nextMonthStart } },
            { paymentDate: null, updatedAt: { lt: nextMonthStart } },
          ],
        },
        select: {
          code: true,
          type: true,
          amount: true,
          paidAmount: true,
          description: true,
          category: true,
          paymentDate: true,
          updatedAt: true,
        },
      }),
    ]);

  const cashEvents: CashEvent[] = [
    ...cashMovements.map((movement) => ({
      type: movement.type,
      amount: decimalToNumber(movement.amount),
      date: movement.movementDate,
      category: movement.category?.name ?? "Sem categoria",
      description: movement.description,
    })),
    ...fallbackSales.map((sale) => ({
      type: "ENTRADA" as CashMovementType,
      amount: decimalToNumber(sale.total),
      date: sale.createdAt,
      category: "Vendas PDV",
      description: `Venda PDV #${sale.code}`,
    })),
    ...fallbackPaidAccounts.map((account) => ({
      type: account.type === "RECEBER" ? ("ENTRADA" as CashMovementType) : ("SAIDA" as CashMovementType),
      amount: decimalToNumber(account.paidAmount ?? account.amount),
      date: account.paymentDate ?? account.updatedAt,
      category: account.category ?? (account.type === "RECEBER" ? "Recebimentos" : "Pagamentos"),
      description: account.description || `Conta #${account.code}`,
    })),
  ];

  const monthEvents = cashEvents.filter((event) => isInRange(event.date, monthStart, nextMonthStart));
  const entries = sumEvents(cashEvents, "ENTRADA", monthStart, nextMonthStart);
  const exits = sumEvents(cashEvents, "SAIDA", monthStart, nextMonthStart);
  const initialBalance =
    sumEvents(cashEvents, "ENTRADA", undefined, monthStart) -
    sumEvents(cashEvents, "SAIDA", undefined, monthStart);

  return {
    period: { monthStart, nextMonthStart },
    accounts: {
      groups: accountGroups,
      receivableOpen: accountAmount(accountGroups, "RECEBER", ["ABERTA", "VENCIDA"]),
      payableOpen: accountAmount(accountGroups, "PAGAR", ["ABERTA", "VENCIDA"]),
      received: accountAmount(accountGroups, "RECEBER", ["PAGA"]),
      paid: accountAmount(accountGroups, "PAGAR", ["PAGA"]),
    },
    cashFlow: {
      initialBalance,
      entries,
      exits,
      finalBalance: initialBalance + entries - exits,
      result: entries - exits,
    },
    periods: [
      { label: "Hoje", entries: sumEvents(cashEvents, "ENTRADA", ranges.todayStart, ranges.tomorrowStart) },
      { label: "Semana", entries: sumEvents(cashEvents, "ENTRADA", ranges.weekStart, ranges.nextWeekStart) },
      { label: "Mes", entries },
    ],
    expenseBuckets: ["Fornecedor", "Aluguel", "Funcionario", "Pecas", "Outras"].map((label) => ({
      label,
      total: monthEvents
        .filter((event) => event.type === "SAIDA" && expenseBucketLabel(event) === label)
        .reduce((sum, event) => sum + event.amount, 0),
    })),
    recentEvents: monthEvents.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20),
  };
}

export async function getStockReportData(tenantId: string) {
  const { monthStart, nextMonthStart } = getDateRanges();

  const [stockCandidates, movements] = await prisma.$transaction([
    prisma.catalogItem.findMany({
      where: {
        tenantId,
        active: true,
        type: "PRODUTO",
        stockCurrent: { not: null },
        stockMinimum: { not: null },
      },
      select: {
        id: true,
        code: true,
        name: true,
        stockCurrent: true,
        stockMinimum: true,
        unit: true,
      },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: monthStart, lt: nextMonthStart }, tenantId },
      select: {
        id: true,
        type: true,
        quantity: true,
        reason: true,
        createdAt: true,
        catalogItem: { select: { id: true, code: true, name: true, unit: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 80,
    }),
  ]);

  const summary = movements.reduce<Record<string, { count: number; quantity: number }>>(
    (current, movement) => {
      const bucket = current[movement.type] ?? { count: 0, quantity: 0 };
      current[movement.type] = {
        count: bucket.count + 1,
        quantity: bucket.quantity + decimalToNumber(movement.quantity),
      };
      return current;
    },
    {}
  );

  const lowStockItems = stockCandidates
    .filter((item) => decimalToNumber(item.stockCurrent) <= decimalToNumber(item.stockMinimum))
    .sort(
      (a, b) =>
        decimalToNumber(a.stockCurrent) -
        decimalToNumber(a.stockMinimum) -
        (decimalToNumber(b.stockCurrent) - decimalToNumber(b.stockMinimum))
    );

  return {
    period: { monthStart, nextMonthStart },
    summary,
    lowStockItems,
    movements,
  };
}

export async function getClientReportData(tenantId: string) {
  const { inactiveSince } = getDateRanges();

  const [saleClientGroups, orderClientGroups, clientLookupRows, clientsForInactivity] =
    await prisma.$transaction([
      prisma.sale.groupBy({
        by: ["clientId"],
        where: { status: "CONCLUIDA", clientId: { not: null }, tenantId },
        orderBy: { clientId: "asc" },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.serviceOrder.groupBy({
        by: ["clientId"],
        where: { status: "FINALIZADA", tenantId },
        orderBy: { clientId: "asc" },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.client.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
      prisma.client.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          status: true,
          sales: {
            where: { status: "CONCLUIDA", tenantId },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          serviceOrders: {
            where: { status: "FINALIZADA", tenantId },
            orderBy: { entryAt: "desc" },
            take: 1,
            select: { entryAt: true },
          },
        },
        orderBy: { name: "asc" },
        take: 300,
      }),
    ]);

  const clientNames = new Map(clientLookupRows.map((client) => [client.id, client.name]));
  const clientTotals = new Map<
    string,
    { id: string; name: string; total: number; orders: number; sales: number }
  >();

  for (const group of saleClientGroups) {
    if (!group.clientId) continue;
    const current = clientTotals.get(group.clientId) ?? {
      id: group.clientId,
      name: clientNames.get(group.clientId) ?? "Cliente",
      total: 0,
      orders: 0,
      sales: 0,
    };
    current.total += decimalToNumber(group._sum?.total);
    current.sales += groupCount(group);
    clientTotals.set(group.clientId, current);
  }

  for (const group of orderClientGroups) {
    const current = clientTotals.get(group.clientId) ?? {
      id: group.clientId,
      name: clientNames.get(group.clientId) ?? "Cliente",
      total: 0,
      orders: 0,
      sales: 0,
    };
    current.total += decimalToNumber(group._sum?.total);
    current.orders += groupCount(group);
    clientTotals.set(group.clientId, current);
  }

  const topClients = Array.from(clientTotals.values()).sort((a, b) => b.total - a.total);
  const inactiveClients = clientsForInactivity
    .map((client) => {
      const lastActivity = latestDate([
        client.sales[0]?.createdAt,
        client.serviceOrders[0]?.entryAt,
      ]);

      return { ...client, lastActivity };
    })
    .filter(
      (client) =>
        client.status === "INATIVO" || !client.lastActivity || client.lastActivity < inactiveSince
    )
    .sort((a, b) => (a.lastActivity?.getTime() ?? 0) - (b.lastActivity?.getTime() ?? 0));

  return {
    topClients,
    inactiveClients,
  };
}
