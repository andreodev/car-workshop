import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Landmark,
  Package,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { CashMovementType, FinancialAccountStatus, FinancialAccountType } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import Header from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type CashEvent = {
  type: CashMovementType;
  amount: number;
  date: Date;
  category: string;
  description: string;
};

type MetricCard = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

const stockTypeLabels: Record<string, string> = {
  ENTRADA: "Entradas",
  SAIDA: "Saídas",
  ESTORNO: "Estornos",
  AJUSTE: "Ajustes",
};

const accountStatusLabels: Record<FinancialAccountStatus, string> = {
  ABERTA: "Abertas",
  PAGA: "Pagas",
  VENCIDA: "Vencidas",
  CANCELADA: "Canceladas",
};

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: unknown) {
  return currencyFormatter.format(decimalToNumber(value));
}

function formatInteger(value: number) {
  return integerFormatter.format(value);
}

function formatQuantity(value: unknown) {
  return decimalToNumber(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateRanges() {
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

function isInRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function sumEvents(events: CashEvent[], type: CashMovementType, start?: Date, end?: Date) {
  return events
    .filter((event) => {
      if (event.type !== type) {
        return false;
      }

      if (start && event.date < start) {
        return false;
      }

      if (end && event.date >= end) {
        return false;
      }

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

function groupCount(group: { _count?: true | { _all?: number | null } | null }) {
  return typeof group._count === "object" && group._count ? group._count._all ?? 0 : 0;
}

function expenseBucketLabel(event: CashEvent) {
  const text = `${event.category} ${event.description}`.toLowerCase();

  if (["fornecedor", "pedido", "compra"].some((word) => text.includes(word))) {
    return "Fornecedor";
  }

  if (["aluguel", "estrutura", "imovel", "imóvel"].some((word) => text.includes(word))) {
    return "Aluguel";
  }

  if (["funcionario", "funcionário", "salario", "salário", "folha"].some((word) => text.includes(word))) {
    return "Funcionário";
  }

  if (["peca", "peça", "pecas", "peças", "oleo", "óleo", "filtro"].some((word) => text.includes(word))) {
    return "Peças";
  }

  return "Outras";
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

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
      <Icon className="size-5 text-muted-foreground/80" />
      <span>{label}</span>
    </div>
  );
}

function SummaryCard({ card }: { card: MetricCard }) {
  return (
    <Card className="min-h-32 shadow-sm">
      <CardHeader className="gap-2">
        <CardTitle className="text-xs font-700 uppercase text-muted-foreground">
          {card.title}
        </CardTitle>
        <CardAction>
          <span className={`flex size-9 items-center justify-center rounded-lg ${card.tone}`}>
            <card.icon className="size-4" />
          </span>
        </CardAction>
        <CardDescription>{card.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <strong className="font-heading text-2xl font-800 text-foreground">{card.value}</strong>
      </CardContent>
    </Card>
  );
}

function BarRow({
  label,
  value,
  total,
  tone = "bg-primary",
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(percent, value > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}

async function getReportsData() {
  const {
    todayStart,
    tomorrowStart,
    weekStart,
    nextWeekStart,
    monthStart,
    nextMonthStart,
    inactiveSince,
  } = getDateRanges();

  const [
    monthServiceOrders,
    monthServiceOrderItems,
    monthSales,
    monthSaleItems,
    accountGroups,
    cashMovements,
    fallbackSales,
    fallbackPaidAccounts,
    stockCandidates,
    monthStockMovements,
    saleClientGroups,
    orderClientGroups,
    clientLookupRows,
    clientsForInactivity,
    recentSales,
    recentServiceOrders,
  ] = await prisma.$transaction([
    prisma.serviceOrder.aggregate({
      where: {
        status: "FINALIZADA",
        entryAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.serviceOrderItem.aggregate({
      where: {
        serviceOrder: {
          status: "FINALIZADA",
          entryAt: { gte: monthStart, lt: nextMonthStart },
        },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: {
        status: "CONCLUIDA",
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
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
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      where: { status: { not: "CANCELADA" } },
      orderBy: [{ type: "asc" }, { status: "asc" }],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.cashMovement.findMany({
      where: { movementDate: { lt: nextMonthStart } },
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
        status: "CONCLUIDA",
        createdAt: { lt: nextMonthStart },
        cashMovements: { none: {} },
      },
      select: {
        code: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.financialAccount.findMany({
      where: {
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
    prisma.catalogItem.findMany({
      where: {
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
      where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
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
    prisma.sale.groupBy({
      by: ["clientId"],
      where: {
        status: "CONCLUIDA",
        clientId: { not: null },
      },
      orderBy: { clientId: "asc" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.serviceOrder.groupBy({
      by: ["clientId"],
      where: { status: "FINALIZADA" },
      orderBy: { clientId: "asc" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        sales: {
          where: { status: "CONCLUIDA" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        serviceOrders: {
          where: { status: "FINALIZADA" },
          orderBy: { entryAt: "desc" },
          take: 1,
          select: { entryAt: true },
        },
      },
      orderBy: { name: "asc" },
      take: 250,
    }),
    prisma.sale.findMany({
      where: {
        status: "CONCLUIDA",
        clientId: { not: null },
      },
      select: {
        id: true,
        code: true,
        total: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { code: "desc" }],
      take: 8,
    }),
    prisma.serviceOrder.findMany({
      where: { status: "FINALIZADA" },
      select: {
        id: true,
        code: true,
        total: true,
        entryAt: true,
        client: { select: { id: true, name: true } },
        vehicle: { select: { plate: true, model: true } },
      },
      orderBy: [{ entryAt: "desc" }, { code: "desc" }],
      take: 8,
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

  const monthEvents = cashEvents.filter((event) =>
    isInRange(event.date, monthStart, nextMonthStart)
  );
  const monthEntries = sumEvents(cashEvents, "ENTRADA", monthStart, nextMonthStart);
  const monthExits = sumEvents(cashEvents, "SAIDA", monthStart, nextMonthStart);
  const initialBalance =
    sumEvents(cashEvents, "ENTRADA", undefined, monthStart) -
    sumEvents(cashEvents, "SAIDA", undefined, monthStart);
  const finalBalance = initialBalance + monthEntries - monthExits;

  const saleProducts = monthSaleItems.filter((item) => item.catalogItem?.type === "PRODUTO");
  const saleServices = monthSaleItems.filter((item) => item.catalogItem?.type === "SERVICO");
  const unclassifiedSaleItems = monthSaleItems.filter((item) => !item.catalogItem);

  const expenseBuckets = ["Fornecedor", "Aluguel", "Funcionário", "Peças", "Outras"].map(
    (label) => ({
      label,
      total: monthEvents
        .filter((event) => event.type === "SAIDA" && expenseBucketLabel(event) === label)
        .reduce((sum, event) => sum + event.amount, 0),
    })
  );

  const stockSummary = monthStockMovements.reduce<Record<string, { count: number; quantity: number }>>(
    (summary, movement) => {
      const current = summary[movement.type] ?? { count: 0, quantity: 0 };
      summary[movement.type] = {
        count: current.count + 1,
        quantity: current.quantity + decimalToNumber(movement.quantity),
      };
      return summary;
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
    )
    .slice(0, 8);

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

  const topClients = Array.from(clientTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

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
    .sort((a, b) => (a.lastActivity?.getTime() ?? 0) - (b.lastActivity?.getTime() ?? 0))
    .slice(0, 8);

  const clientHistory = [
    ...recentSales.map((sale) => ({
      id: `sale-${sale.id}`,
      type: "Venda",
      code: sale.code,
      date: sale.createdAt,
      total: decimalToNumber(sale.total),
      clientId: sale.client?.id,
      clientName: sale.client?.name ?? "Cliente",
      detail: "PDV",
      href: "/pdv/vendas",
    })),
    ...recentServiceOrders.map((order) => ({
      id: `order-${order.id}`,
      type: "OS",
      code: order.code,
      date: order.entryAt,
      total: decimalToNumber(order.total),
      clientId: order.client.id,
      clientName: order.client.name,
      detail: [order.vehicle.plate, order.vehicle.model].filter(Boolean).join(" - "),
      href: `/ordens-servico/${order.id}/detalhes`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return {
    ranges: {
      todayStart,
      tomorrowStart,
      weekStart,
      nextWeekStart,
      monthStart,
      nextMonthStart,
    },
    sales: {
      serviceOrders: monthServiceOrders,
      serviceOrderItems: monthServiceOrderItems,
      sales: monthSales,
      productsTotal: saleProducts.reduce((sum, item) => sum + decimalToNumber(item.total), 0),
      productsQuantity: saleProducts.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0),
      servicesTotal: saleServices.reduce((sum, item) => sum + decimalToNumber(item.total), 0),
      servicesQuantity: saleServices.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0),
      unclassifiedTotal: unclassifiedSaleItems.reduce(
        (sum, item) => sum + decimalToNumber(item.total),
        0
      ),
    },
    accounts: {
      groups: accountGroups,
      receivableOpen: accountAmount(accountGroups, "RECEBER", ["ABERTA", "VENCIDA"]),
      payableOpen: accountAmount(accountGroups, "PAGAR", ["ABERTA", "VENCIDA"]),
      received: accountAmount(accountGroups, "RECEBER", ["PAGA"]),
      paid: accountAmount(accountGroups, "PAGAR", ["PAGA"]),
    },
    revenuePeriods: [
      {
        label: "Hoje",
        value: sumEvents(cashEvents, "ENTRADA", todayStart, tomorrowStart),
      },
      {
        label: "Semana",
        value: sumEvents(cashEvents, "ENTRADA", weekStart, nextWeekStart),
      },
      {
        label: "Mês",
        value: monthEntries,
      },
    ],
    expenses: {
      buckets: expenseBuckets,
      total: monthExits,
    },
    profit: {
      entries: monthEntries,
      exits: monthExits,
      result: monthEntries - monthExits,
    },
    cashFlow: {
      initialBalance,
      entries: monthEntries,
      exits: monthExits,
      finalBalance,
    },
    stock: {
      lowStockItems,
      summary: stockSummary,
      recentMovements: monthStockMovements.slice(0, 8),
    },
    clients: {
      topClients,
      inactiveClients,
      history: clientHistory,
    },
  };
}

export default async function ReportsPage() {
  const data = await getReportsData();
  const monthSalesTotal =
    decimalToNumber(data.sales.serviceOrders._sum.total) +
    decimalToNumber(data.sales.sales._sum.total);
  const salesBreakdownTotal =
    decimalToNumber(data.sales.serviceOrders._sum.total) +
    data.sales.productsTotal +
    data.sales.servicesTotal +
    data.sales.unclassifiedTotal;
  const accountBalance = data.accounts.receivableOpen - data.accounts.payableOpen;
  const resultIsPositive = data.profit.result >= 0;

  const mainCards: MetricCard[] = [
    {
      title: "Vendas no mês",
      value: formatCurrency(monthSalesTotal),
      description: `${formatInteger(data.sales.serviceOrders._count._all)} OS e ${formatInteger(
        data.sales.sales._count._all
      )} vendas PDV`,
      icon: ReceiptText,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Contas em aberto",
      value: formatCurrency(data.accounts.receivableOpen + data.accounts.payableOpen),
      description: `${formatCurrency(data.accounts.receivableOpen)} a receber`,
      icon: Landmark,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      title: "Resultado do mês",
      value: formatCurrency(data.profit.result),
      description: resultIsPositive ? "Lucro operacional no caixa" : "Prejuízo operacional no caixa",
      icon: resultIsPositive ? TrendingUp : TrendingDown,
      tone: resultIsPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
    },
    {
      title: "Saldo final",
      value: formatCurrency(data.cashFlow.finalBalance),
      description: `Desde ${formatDate(data.ranges.monthStart)}`,
      icon: Wallet,
      tone: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Relatórios"
          description="Visão consolidada de vendas, financeiro, caixa, estoque e clientes."
        />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-8 gap-2 px-3">
            <Link href="/financeiro">
              <Landmark className="size-3.5" />
              Financeiro
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-8 gap-2 px-3">
            <Link href="/pdv/vendas">
              <ReceiptText className="size-3.5" />
              Vendas
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mainCards.map((card) => (
          <SummaryCard key={card.title} card={card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-primary" />
              Vendas
            </CardTitle>
            <CardDescription>Quanto entrou por OS, peças e serviços no mês atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Ordens de serviço</span>
                <strong className="block font-heading text-lg">
                  {formatCurrency(data.sales.serviceOrders._sum.total)}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {formatInteger(data.sales.serviceOrders._count._all)} finalizadas
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Peças e produtos</span>
                <strong className="block font-heading text-lg">
                  {formatCurrency(data.sales.productsTotal)}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {formatQuantity(data.sales.productsQuantity)} itens
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Serviços</span>
                <strong className="block font-heading text-lg">
                  {formatCurrency(data.sales.servicesTotal)}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {formatQuantity(data.sales.servicesQuantity)} itens
                </span>
              </div>
            </div>
            <div className="grid gap-3">
              <BarRow
                label="OS finalizadas"
                value={decimalToNumber(data.sales.serviceOrders._sum.total)}
                total={salesBreakdownTotal}
              />
              <BarRow
                label="Peças e produtos no PDV"
                value={data.sales.productsTotal}
                total={salesBreakdownTotal}
                tone="bg-emerald-600"
              />
              <BarRow
                label="Serviços no PDV"
                value={data.sales.servicesTotal}
                total={salesBreakdownTotal}
                tone="bg-sky-600"
              />
              {data.sales.unclassifiedTotal > 0 ? (
                <BarRow
                  label="Itens sem classificação"
                  value={data.sales.unclassifiedTotal}
                  total={salesBreakdownTotal}
                  tone="bg-muted-foreground"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              Contas
            </CardTitle>
            <CardDescription>Resumo de contas a pagar e receber.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-xs text-emerald-700">A receber</span>
                <strong className="block font-heading text-lg text-emerald-800">
                  {formatCurrency(data.accounts.receivableOpen)}
                </strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-xs text-red-700">A pagar</span>
                <strong className="block font-heading text-lg text-red-800">
                  {formatCurrency(data.accounts.payableOpen)}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground">Projeção aberta</span>
              <strong className="font-heading text-lg">{formatCurrency(accountBalance)}</strong>
            </div>
            <div className="grid gap-2">
              {data.accounts.groups.map((group) => (
                <div
                  key={`${group.type}-${group.status}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span className="min-w-0 truncate text-xs">
                    {group.type === "RECEBER" ? "Receber" : "Pagar"} - {accountStatusLabels[group.status]}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{formatInteger(groupCount(group))}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatCurrency(group._sum?.amount)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="size-4 text-primary" />
              Receitas
            </CardTitle>
            <CardDescription>Entradas por período.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.revenuePeriods.map((period) => (
              <div
                key={period.label}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <span className="text-xs text-muted-foreground">{period.label}</span>
                <strong className="font-heading text-lg">{formatCurrency(period.value)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownLeft className="size-4 text-primary" />
              Despesas
            </CardTitle>
            <CardDescription>Saídas por categoria no mês.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.expenses.buckets.map((bucket) => (
              <BarRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.total}
                total={data.expenses.total}
                tone={bucket.label === "Outras" ? "bg-muted-foreground" : "bg-red-500"}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="size-4 text-primary" />
              Receitas x Despesas
            </CardTitle>
            <CardDescription>Lucro ou prejuízo no caixa do mês.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-xs text-emerald-700">Receitas</span>
                <strong className="block font-heading text-lg text-emerald-800">
                  {formatCurrency(data.profit.entries)}
                </strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-xs text-red-700">Despesas</span>
                <strong className="block font-heading text-lg text-red-800">
                  {formatCurrency(data.profit.exits)}
                </strong>
              </div>
            </div>
            <div
              className={`rounded-lg border p-4 ${
                resultIsPositive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="text-xs">{resultIsPositive ? "Lucro" : "Prejuízo"}</span>
              <strong className="block font-heading text-2xl">
                {formatCurrency(data.profit.result)}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" />
            Fluxo de caixa
          </CardTitle>
          <CardDescription>Saldo inicial, entradas, saídas e saldo final.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[
            ["Saldo inicial", data.cashFlow.initialBalance],
            ["Entradas", data.cashFlow.entries],
            ["Saídas", data.cashFlow.exits],
            ["Saldo final", data.cashFlow.finalBalance],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <strong className="block font-heading text-xl">{formatCurrency(value)}</strong>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-primary" />
              Estoque
            </CardTitle>
            <CardDescription>Peças em baixa quantidade, entradas e saídas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              {["ENTRADA", "SAIDA", "ESTORNO", "AJUSTE"].map((type) => {
                const summary = data.stock.summary[type] ?? { count: 0, quantity: 0 };

                return (
                  <div key={type} className="rounded-lg border border-border bg-background p-3">
                    <span className="text-xs text-muted-foreground">{stockTypeLabels[type]}</span>
                    <strong className="block font-heading text-lg">
                      {formatQuantity(summary.quantity)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {formatInteger(summary.count)} movimentos
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2">
              <h3 className="text-xs font-700 uppercase text-muted-foreground">Baixo estoque</h3>
              {data.stock.lowStockItems.length > 0 ? (
                data.stock.lowStockItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/produtos/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        #{item.code} - {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">Unidade: {item.unit ?? "-"}</span>
                    </span>
                    <Badge variant="destructive">
                      {formatQuantity(item.stockCurrent)} / {formatQuantity(item.stockMinimum)}
                    </Badge>
                  </Link>
                ))
              ) : (
                <EmptyState icon={Package} label="Nenhum produto abaixo do mínimo." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" />
              Movimentos recentes
            </CardTitle>
            <CardDescription>Entrada e saída de produtos no mês.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.stock.recentMovements.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.stock.recentMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="max-w-52">
                          <Link
                            href={`/produtos/${movement.catalogItem.id}`}
                            className="block truncate font-medium hover:text-primary"
                            title={movement.catalogItem.name}
                          >
                            #{movement.catalogItem.code} - {movement.catalogItem.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.type === "SAIDA" ? "destructive" : "outline"}>
                            {stockTypeLabels[movement.type] ?? movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-60 truncate text-muted-foreground">
                          {movement.reason}
                        </TableCell>
                        <TableCell>{formatDate(movement.createdAt)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatQuantity(movement.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Package} label="Nenhum movimento de estoque no mês." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            Clientes
          </CardTitle>
          <CardDescription>Maiores compradores, inativos e histórico recente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          <div className="grid gap-2">
            <h3 className="text-xs font-700 uppercase text-muted-foreground">Mais compraram</h3>
            {data.clients.topClients.length > 0 ? (
              data.clients.topClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatInteger(client.sales)} vendas e {formatInteger(client.orders)} OS
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatCurrency(client.total)}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState icon={Users} label="Sem compras registradas." />
            )}
          </div>

          <div className="grid gap-2">
            <h3 className="text-xs font-700 uppercase text-muted-foreground">Inativos</h3>
            {data.clients.inactiveClients.length > 0 ? (
              data.clients.inactiveClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Último movimento: {formatDate(client.lastActivity)}
                    </span>
                  </span>
                  <Badge variant={client.status === "INATIVO" ? "secondary" : "outline"}>
                    {client.status === "INATIVO" ? "Inativo" : "90+ dias"}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyState icon={Users} label="Nenhum cliente inativo encontrado." />
            )}
          </div>

          <div className="grid gap-2">
            <h3 className="text-xs font-700 uppercase text-muted-foreground">Histórico recente</h3>
            {data.clients.history.length > 0 ? (
              data.clients.history.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.type} #{item.code} - {item.clientName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDate(item.date)} · {item.detail}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                    {formatCurrency(item.total)}
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState icon={ClipboardList} label="Sem histórico recente." />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
