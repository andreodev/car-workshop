import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Car,
  ClipboardList,
  FileText,
  PlusCircle,
  ReceiptText,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import { DashboardWelcome } from "@/app/_components/dashboard-welcome";
import Header from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEstimateStatusOption } from "@/modules/estimate/utils/estimate-status";
import { getServiceOrderStatusOption } from "@/app/(app)/ordens-servico/status";
import {
  activeServiceOrderStatuses,
  dashboardPeriodOptions,
  openEstimateStatuses,
  quickActions,
  stepByStep,
} from "./utils/dashboard.constants";
import { decimalToNumber } from "@/lib/finance/decimalToNumber";
import { getDashboardData } from "./service/dashboard.service";
import { normalizeDashboardPeriod, statusCount } from "./utils/dashboard.date";
import { formatInteger } from "@/app/lib/reports";
import { CardMetric } from "./components/cards";
import { financialAmountDashboard } from "./utils/dashboard.financial";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPeriod = normalizeDashboardPeriod(
    Array.isArray(params?.period) ? params.period[0] : params?.period,
  );
  const data = await getDashboardData(selectedPeriod);

  const activeServiceOrders = activeServiceOrderStatuses.reduce(
    (total, status) => total + statusCount(data.serviceOrderGroups, status),
    0,
  );
  const blockedServiceOrders =
    statusCount(data.serviceOrderGroups, "AGUARDANDO_PECAS") +
    statusCount(data.serviceOrderGroups, "IMPEDIDA");
  const openEstimates = openEstimateStatuses.reduce(
    (total, status) => total + statusCount(data.estimateGroups, status),
    0,
  );
  const receivableMonth = financialAmountDashboard(
    data.financialGroups,
    "RECEBER",
  );
  const payableMonth = financialAmountDashboard(data.financialGroups, "PAGAR");
  const balanceProjection = receivableMonth - payableMonth;

  const operationCards = [
    {
      title: "Atendimentos em andamento",
      value: formatInteger(activeServiceOrders),
      description: `${formatInteger(blockedServiceOrders)} parados ou aguardando peça`,
      href: "/atendimentos",
      icon: Wrench,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Vendas de hoje",
      value: formatCurrency(decimalToNumber(data.periodSales._sum.total)),
      description: `${formatInteger(data.periodSales._count._all)} recebimentos no período`,
      href: "/pdv/vendas",
      icon: ShoppingCart,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Orçamentos pendentes",
      value: formatInteger(openEstimates),
      description: `${formatInteger(statusCount(data.estimateGroups, "APROVADO"))} aprovados para virar OS`,
      href: "/atendimentos",
      icon: FileText,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      title: "Saldo previsto",
      value: formatCurrency(balanceProjection),
      description: "A receber menos a pagar no período",
      href: "/financeiro",
      icon: Banknote,
      tone: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-5">
      <DashboardWelcome />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Hoje na oficina"
          description="Comece atendimentos, veja a fila e acompanhe o financeiro sem procurar em vários menus."
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
                  aria-current={
                    option.value === data.period ? "page" : undefined
                  }
                >
                  {option.label}
                </Link>
              </Button>
            ))}
          </div>
          <Button asChild className="h-8 gap-2 px-3">
            <Link href="/atendimentos">
              <PlusCircle className="size-3.5" />
              Novo atendimento
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_45%)] shadow-sm">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr] lg:p-5">
          <div className="flex flex-col justify-between gap-5">
            <div>
              <div className="mb-3 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ClipboardList className="size-3.5" />
                Fluxo simples
              </div>
              <h2 className="max-w-2xl text-2xl font-800 tracking-tight text-foreground md:text-3xl">
                Atenda, aprove, execute e receba pelo mesmo caminho.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Use a tela de Atendimentos para decidir se o caso começa como
                orçamento, ordem de serviço ou venda rápida no caixa.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/atendimentos">
                  <PlusCircle className="size-4" />
                  Novo atendimento
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link href="/pdv">
                  <ShoppingCart className="size-4" />
                  Venda rápida
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                asChild
                variant={action.variant}
                className="h-auto justify-start gap-3 rounded-lg p-3 text-left"
              >
                <Link href={action.href}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-foreground">
                    <action.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{action.title}</span>
                    <span className="block text-xs font-normal opacity-75">
                    </span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {operationCards.map((card) => (
          <Link key={card.title} href={card.href} className="group">
            <Card className="h-full min-h-32 shadow-sm transition-colors group-hover:border-primary/45 group-hover:bg-accent/30">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xs font-700 uppercase text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}
                  >
                    <card.icon className="size-4" />
                  </span>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <strong className="font-heading text-2xl font-800 text-foreground">
                  {card.value}
                </strong>
                <span className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight className="size-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Fila de atendimento
            </CardTitle>
            <CardDescription>
              O que precisa andar agora na oficina.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.recentServiceOrders.length > 0 ? (
              data.recentServiceOrders.slice(0, 5).map((order) => {
                const statusOption = getServiceOrderStatusOption(order.status);

                return (
                  <Link
                    key={order.id}
                    href={`/ordens-servico/${order.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        OS #{order.code} - {order.client.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {order.vehicle.plate}
                        {order.vehicle.model ? ` - ${order.vehicle.model}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant={statusOption.variant}
                        className={statusOption.className}
                      >
                        {statusOption.label}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatCurrency(decimalToNumber(order.total))}
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                Nenhuma OS ativa para o período selecionado.
              </div>
            )}
            <Button asChild variant="outline" className="mt-2 justify-between">
              <Link href="/atendimentos">
                Ver todos os atendimentos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ReceiptText className="size-4 text-primary" />
                Orçamentos para acompanhar
              </CardTitle>
              <CardDescription>
                Propostas abertas que podem virar ordem de serviço.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.recentEstimates.length > 0 ? (
                data.recentEstimates.slice(0, 4).map((estimate) => {
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
                          {estimate.vehicle.model
                            ? ` - ${estimate.vehicle.model}`
                            : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant={statusOption.variant}
                          className={statusOption.className}
                        >
                          {statusOption.label}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatCurrency(decimalToNumber(estimate.total))}
                        </span>
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                  Sem orçamentos pendentes no período.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="size-4 text-primary" />
                Financeiro simples
              </CardTitle>
              <CardDescription>A receber, a pagar e atrasos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/financeiro"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                >
                  <span className="text-xs text-emerald-700">A receber</span>
                  <strong className="block font-heading text-lg text-emerald-800">
                    {formatCurrency(receivableMonth)}
                  </strong>
                </Link>
                <Link
                  href="/financeiro/contas-pagar"
                  className="rounded-lg border border-red-200 bg-red-50 p-3"
                >
                  <span className="text-xs text-red-700">A pagar</span>
                  <strong className="block font-heading text-lg text-red-800">
                    {formatCurrency(payableMonth)}
                  </strong>
                </Link>
              </div>
              <Link
                href="/financeiro"
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"
              >
                <span className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="size-3.5" />
                  Vencidas
                </span>
                <strong className="font-heading text-lg">
                  {formatCurrency(
                    decimalToNumber(data.overdueFinancial._sum.amount),
                  )}
                </strong>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Cadastros rápidos</CardTitle>
            <CardDescription>
              O mínimo para começar um atendimento novo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <CardMetric
              href="/clientes/novo"
              icon={Users}
              label="Novo cliente"
              value={data.clientCount}
            />
            <CardMetric
              href="/veiculos/create"
              icon={Car}
              label="Novo veículo"
              value={data.vehicleCount}
            />
            <CardMetric
              href="/produtos/novo"
              icon={ClipboardList}
              label="Produto ou serviço"
              value={data.mechanicCount}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Etapas do atendimento</CardTitle>
            <CardDescription>
              A regra do sistema continua igual; a entrada ficou mais direta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {stepByStep.map(([step, title, description]) => (
              <div
                key={step}
                className="rounded-lg border border-border bg-background p-4"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-800 text-primary">
                  {step}
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
