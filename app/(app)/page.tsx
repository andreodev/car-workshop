import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  Car,
  ClipboardList,
  FileText,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import type {
  CatalogItem,
  EstimateStatus,
  FinancialAccountStatus,
  FinancialAccountType,
  Prisma,
  ServiceOrderStatus,
} from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { DashboardWelcome } from "@/app/_components/dashboard-welcome";
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
import { Empty, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEstimateStatusOption } from "./orcamentos/status";
import { getServiceOrderStatusOption } from "./ordens-servico/status";

export const dynamic = "force-dynamic";

const activeServiceOrderStatuses: ServiceOrderStatus[] = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
];

const openEstimateStatuses: EstimateStatus[] = ["RASCUNHO", "ENVIADO", "APROVADO"];

const dashboardPeriodOptions = [
  { value: "yesterday", label: "Ontem" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
] as const;

type DashboardPeriod = (typeof dashboardPeriodOptions)[number]["value"];

const serviceOrderStatusLabels: Record<ServiceOrderStatus, string> = {
  ABERTA: "A fazer",
  EM_ANDAMENTO: "Em execução",
  AGUARDANDO_PECAS: "Aguardando peças",
  IMPEDIDA: "Impedidas",
  FINALIZADA: "Finalizadas",
  CANCELADA: "Canceladas",
  PAGA: "Pagas",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

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

function normalizeDashboardPeriod(value: unknown): DashboardPeriod {
  if (
    typeof value === "string" &&
    dashboardPeriodOptions.some((option) => option.value === value)
  ) {
    return value as DashboardPeriod;
  }

  return "today";
}

function getDashboardPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const ranges: Record<
    DashboardPeriod,
    { start: Date; end: Date; label: string; shortLabel: string }
  > = {
    yesterday: {
      start: yesterdayStart,
      end: todayStart,
      label: "ontem",
      shortLabel: "Ontem",
    },
    today: {
      start: todayStart,
      end: tomorrowStart,
      label: "hoje",
      shortLabel: "Hoje",
    },
    week: {
      start: weekStart,
      end: nextWeekStart,
      label: "nesta semana",
      shortLabel: "Semana",
    },
    month: {
      start: monthStart,
      end: nextMonthStart,
      label: "neste mês",
      shortLabel: "Mês",
    },
  };

  return {
    ...ranges[period],
    todayStart,
  };
}

function getSupplierDateRanges() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(todayStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  nextWeekEnd.setHours(23, 59, 59, 999);

  return { nextWeekEnd };
}

function statusCount<TStatus extends string>(
  groups: Array<{
    status: TStatus;
    _count?: { _all?: number | null } | true | null;
  }>,
  status: TStatus
) {
  const count = groups.find((group) => group.status === status)?._count;
  return typeof count === "object" && count ? count._all ?? 0 : 0;
}

function financialAmount(
  groups: Array<{
    type: FinancialAccountType;
    status: FinancialAccountStatus;
    _sum?: { amount?: unknown } | null;
  }>,
  type: FinancialAccountType
) {
  return groups
    .filter(
      (group) =>
        group.type === type &&
        (group.status === "ABERTA" || group.status === "VENCIDA")
    )
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
}

async function getDashboardData(period: DashboardPeriod) {
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPeriod = normalizeDashboardPeriod(
    Array.isArray(params?.period) ? params.period[0] : params?.period
  );
  const data = await getDashboardData(selectedPeriod);

  const activeServiceOrders = activeServiceOrderStatuses.reduce(
    (total, status) => total + statusCount(data.serviceOrderGroups, status),
    0
  );
  const blockedServiceOrders =
    statusCount(data.serviceOrderGroups, "AGUARDANDO_PECAS") +
    statusCount(data.serviceOrderGroups, "IMPEDIDA");
  const openEstimates = openEstimateStatuses.reduce(
    (total, status) => total + statusCount(data.estimateGroups, status),
    0
  );
  const receivableMonth = financialAmount(data.financialGroups, "RECEBER");
  const payableMonth = financialAmount(data.financialGroups, "PAGAR");
  const balanceProjection = receivableMonth - payableMonth;

  const operationCards = [
    {
      title: "OS ativas",
      value: formatInteger(activeServiceOrders),
      description: `${formatInteger(blockedServiceOrders)} exigem atenção ${data.periodLabel}`,
      href: "/ordens-servico",
      icon: Wrench,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Faturamento",
      value: formatCurrency(data.periodSales._sum.total),
      description: `${formatInteger(data.periodSales._count._all)} vendas/OS pagas ${data.periodLabel}`,
      href: "/pdv/vendas",
      icon: TrendingUp,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Vendas no período",
      value: formatInteger(data.periodSales._count._all),
      description: `${formatCurrency(data.periodSales._sum.total)} em atendimentos ${data.periodLabel}`,
      href: "/pdv",
      icon: ShoppingCart,
      tone: "bg-blue-100 text-blue-700",
    },
    {
      title: "Orçamentos abertos",
      value: formatInteger(openEstimates),
      description: `${formatInteger(statusCount(data.estimateGroups, "APROVADO"))} aprovados ${data.periodLabel}`,
      href: "/orcamentos",
      icon: FileText,
      tone: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-6">
      <DashboardWelcome />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Painel"
          description="Resumo operacional da oficina, financeiro, estoque e compras."
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex flex-wrap rounded-lg border border-border bg-background p-1">
            {dashboardPeriodOptions.map((option) => (
              <Button
                key={option.value}
                asChild
                variant={option.value === data.period ? "secondary" : "ghost"}
                className="h-7 px-3"
              >
                <Link
                  href={`/?period=${option.value}`}
                  aria-current={option.value === data.period ? "page" : undefined}
                >
                  {option.label}
                </Link>
              </Button>
            ))}
          </div>
          <Button asChild variant="outline" className="h-8 gap-2 px-3">
            <Link href="/orcamentos/novo">
              <FileText className="size-3.5" />
              Orçamento
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-8 gap-2 px-3">
            <Link href="/pdv">
              <ShoppingCart className="size-3.5" />
              Caixa
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationCards.map((card) => (
          <Card key={card.title} className="min-h-32 shadow-sm">
            <CardHeader className="gap-2">
              <CardTitle className="text-xs font-700 uppercase text-muted-foreground">
                {card.title}
              </CardTitle>
              <CardAction>
                <span
                  className={`flex size-9 items-center justify-center rounded-lg ${card.tone}`}
                >
                  <card.icon className="size-4" />
                </span>
              </CardAction>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <strong className="font-heading text-2xl font-800 text-foreground">
                {card.value}
              </strong>
              <Button asChild variant="ghost" size="icon-sm" aria-label={`Abrir ${card.title}`}>
                <Link href={card.href}>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Fila de serviço
            </CardTitle>
            <CardDescription>
              Distribuição das ordens em andamento {data.periodLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid flex-1 content-center gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {activeServiceOrderStatuses.map((status) => {
              const count = statusCount(data.serviceOrderGroups, status);
              const percent = activeServiceOrders > 0 ? (count / activeServiceOrders) * 100 : 0;

              return (
                <div key={status} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {serviceOrderStatusLabels[status]}
                    </span>
                    <span className="font-heading text-lg font-800">{count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(percent, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-4 text-primary" />
              Financeiro
            </CardTitle>
            <CardDescription>
              Entradas, saídas e pendências com vencimento {data.periodLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-xs text-emerald-700">A receber</span>
                <strong className="block font-heading text-lg text-emerald-800">
                  {formatCurrency(receivableMonth)}
                </strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-xs text-red-700">A pagar</span>
                <strong className="block font-heading text-lg text-red-800">
                  {formatCurrency(payableMonth)}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground">Projeção</span>
              <strong className="font-heading text-lg">{formatCurrency(balanceProjection)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <span className="flex items-center gap-2 text-xs">
                <AlertTriangle className="size-3.5" />
                Vencidas até hoje
              </span>
              <strong className="font-heading text-lg">
                {formatCurrency(data.overdueFinancial._sum.amount)}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-primary" />
              Ordens recentes
            </CardTitle>
            <CardDescription>
              Últimas ordens ainda abertas com entrada {data.periodLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentServiceOrders.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="text-xs uppercase text-muted-foreground">OS</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground">
                        Cliente
                      </TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground">
                        Veículo
                      </TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase text-muted-foreground">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentServiceOrders.map((order) => {
                      const statusOption = getServiceOrderStatusOption(order.status);

                      return (
                        <TableRow key={order.id} className="hover:bg-accent/40">
                          <TableCell className="font-mono text-sm font-medium">
                            <Link href={`/ordens-servico/${order.id}`} className="hover:text-primary">
                              #{order.code}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-44">
                            <Link
                              href={`/clientes/${order.client.id}`}
                              className="block truncate font-medium hover:text-primary"
                              title={order.client.name}
                            >
                              {order.client.name}
                            </Link>
                            <span className="block truncate text-xs text-muted-foreground">
                              {order.mechanic?.name ?? order.responsible}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-44 text-muted-foreground">
                            <span className="block truncate">
                              {order.vehicle.plate}
                              {order.vehicle.model ? ` - ${order.vehicle.model}` : ""}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusOption.variant} className={statusOption.className}>
                              {statusOption.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(order.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Wrench} label="Nenhuma ordem ativa no momento." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ReceiptText className="size-4 text-primary" />
                Orçamentos em aberto
              </CardTitle>
              <CardDescription>
                Propostas criadas {data.periodLabel} que ainda podem virar OS.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.recentEstimates.length > 0 ? (
                data.recentEstimates.map((estimate) => {
                  const statusOption = getEstimateStatusOption(estimate.status);

                  return (
                    <Link
                      key={estimate.id}
                      href={`/orcamentos/${estimate.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          #{estimate.code} - {estimate.client.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {estimate.vehicle.plate}
                          {estimate.vehicle.model ? ` - ${estimate.vehicle.model}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={statusOption.variant} className={statusOption.className}>
                          {statusOption.label}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatCurrency(estimate.total)}
                        </span>
                      </span>
                    </Link>
                  );
                })
              ) : (
                <EmptyState icon={FileText} label="Sem orçamentos em aberto." />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="size-4 text-primary" />
                Base ativa
              </CardTitle>
              <CardDescription>Clientes, veículos e equipe cadastrados.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <MiniMetric
                href="/clientes"
                icon={Users}
                label="Clientes"
                value={data.clientCount}
              />
              <MiniMetric href="/veiculos" icon={Car} label="Veículos" value={data.vehicleCount} />
              <MiniMetric
                href="/mecanicos"
                icon={Wrench}
                label="Mecânicos"
                value={data.mechanicCount}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-primary" />
              Estoque baixo
            </CardTitle>
            <CardDescription>Itens com saldo igual ou abaixo do mínimo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item) => (
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
                    {decimalToNumber(item.stockCurrent)} / {decimalToNumber(item.stockMinimum)}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyState icon={Package} label="Nenhum item abaixo do mínimo." />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" />
              Compras pendentes
            </CardTitle>
            <CardDescription>
              {formatInteger(data.openSupplierOrders)} pedidos de fornecedor em aberto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.urgentSupplierOrders.length > 0 ? (
              data.urgentSupplierOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/fornecedores/pedidos/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      #{order.code} - {order.supplier.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Previsão {formatDate(order.forecastAt)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <EmptyState icon={Package} label="Nenhuma compra com previsão próxima." />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Empty className="min-h-28 bg-background">
      <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <EmptyTitle className="text-sm font-medium text-muted-foreground">
        {label}
      </EmptyTitle>
    </Empty>
  );
}

function MiniMetric({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 flex-col justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
    >
      <Icon className="size-4 text-primary" />
      <span>
        <strong className="block font-heading text-xl">{formatInteger(value)}</strong>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}
