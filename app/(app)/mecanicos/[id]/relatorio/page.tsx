"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { fetchMechanicReport } from "../../mechanic-api";
import type {
  MechanicReportFinancialAccount,
  MechanicReportOrder,
  MechanicReportOrderItem,
} from "../../types";
import { getServiceOrderStatusOption } from "../../../ordens-servico/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/ui/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MechanicReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatPercent(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

function formatVehicleLabel(vehicle: MechanicReportOrder["vehicle"]) {
  if (!vehicle) {
    return "-";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model].filter(Boolean).join(" - ");
}

function formatVehicle(order: MechanicReportOrder) {
  return formatVehicleLabel(order.vehicle);
}

function financialStatusBadge(status: MechanicReportFinancialAccount["status"]) {
  const className =
    status === "PAGA"
      ? "bg-emerald-600/10 text-emerald-700"
      : status === "VENCIDA"
        ? "bg-amber-500/10 text-amber-700"
        : status === "CANCELADA"
          ? "bg-destructive/10 text-destructive"
          : "bg-sky-600/10 text-sky-700";

  return <Badge className={className}>{status}</Badge>;
}

function paymentMethodLabel(value: MechanicReportFinancialAccount["paymentMethod"]) {
  const labels: Record<NonNullable<MechanicReportFinancialAccount["paymentMethod"]>, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "Pix",
    CARTAO_CREDITO: "Cartão crédito",
    CARTAO_DEBITO: "Cartão débito",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };

  return value ? labels[value] : "-";
}

function itemCatalogLabel(item: MechanicReportOrderItem) {
  if (!item.catalogItem) {
    return "-";
  }

  return `#${item.catalogItem.code} ${item.catalogItem.name}`;
}

function OrdersTable({ orders }: { orders: MechanicReportOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhuma OS encontrada nesta visão.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead className="text-right">Itens</TableHead>
            <TableHead>Comissão financeira</TableHead>
            <TableHead className="text-right">Base comissão</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-right">Serviços</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusOption = getServiceOrderStatusOption(order.status);

            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono">#{order.code}</TableCell>
                <TableCell className="font-medium">{order.client?.name ?? "-"}</TableCell>
                <TableCell>{formatVehicle(order)}</TableCell>
                <TableCell>
                  <Badge variant={statusOption.variant} className={statusOption.className}>
                    {statusOption.label}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(order.entryAt)}</TableCell>
                <TableCell className="text-right">{order.items.length}</TableCell>
                <TableCell>
                  {order.commissionAccounts.length ? (
                    <div className="flex flex-wrap gap-1">
                      {order.commissionAccounts.map((account) => (
                        <span key={account.id}>{financialStatusBadge(account.status)}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sem conta</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(order.serviceTotal)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.commissionTotal)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/ordens-servico/${order.id}/detalhes`}>Detalhes</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ServiceItemsTable({
  items,
}: {
  items: Array<
    MechanicReportOrderItem & {
      order: {
        id: string;
        code: number;
        status: MechanicReportOrder["status"];
        entryAt: string;
        client: MechanicReportOrder["client"];
        vehicle: MechanicReportOrder["vehicle"];
      };
    }
  >;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhum serviço encontrado para este mecânico.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Catálogo</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Unitário</TableHead>
            <TableHead className="text-right">Desconto</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Base</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono">#{item.order.code}</TableCell>
              <TableCell className="font-medium">{item.order.client?.name ?? "-"}</TableCell>
              <TableCell>{formatVehicleLabel(item.order.vehicle)}</TableCell>
              <TableCell className="min-w-[220px]">{item.description}</TableCell>
              <TableCell>{itemCatalogLabel(item)}</TableCell>
              <TableCell>{item.sector?.name ?? "-"}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(item.commissionBase)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CommissionAccountsTable({ orders }: { orders: MechanicReportOrder[] }) {
  const accounts = orders.flatMap((order) =>
    order.commissionAccounts.map((account) => ({
      ...account,
      order,
    }))
  );

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhuma conta de comissão gerada para as OS deste mecânico.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1120px]">
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Observação</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Pago</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono">#{account.code}</TableCell>
              <TableCell className="font-mono">#{account.order.code}</TableCell>
              <TableCell>{financialStatusBadge(account.status)}</TableCell>
              <TableCell>{formatDate(account.dueDate)}</TableCell>
              <TableCell>{formatDate(account.paymentDate)}</TableCell>
              <TableCell>{paymentMethodLabel(account.paymentMethod)}</TableCell>
              <TableCell className="max-w-[360px] text-sm text-muted-foreground">
                <div className="line-clamp-2">{account.notes ?? account.description}</div>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(account.amount)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(account.paidAmount ?? "0")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MechanicReportPage({ params }: MechanicReportPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mechanic-report", id],
    queryFn: () => fetchMechanicReport(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando relatório do mecânico...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o relatório."}
      </div>
    );
  }

  const metrics = [
    { label: "OS com serviços", value: data.summary.totalOrders },
    { label: "Serviços", value: data.summary.serviceItemsCount },
    { label: "OS ativas", value: data.summary.activeOrders },
    { label: "Concluídas", value: data.summary.completedOrders },
    { label: "Concluídas no mês", value: data.summary.monthCompletedOrders },
    { label: "Falta peça", value: data.summary.waitingPartsOrders },
    { label: "Pendentes", value: data.summary.blockedOrders },
  ];

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/mecanicos">
              <ArrowLeft className="size-4" />
              Voltar para mecânicos
            </Link>
          </Button>
          <Header
            title={`Relatório de ${data.mechanic.name}`}
            description="Rastreabilidade dos serviços vinculados ao mecânico por item da OS."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-fit">
            Comissão {formatPercent(data.summary.commissionPercent)}
          </Badge>
          <Badge variant={data.mechanic.active ? "default" : "secondary"} className="h-fit">
            {data.mechanic.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Base comissionável</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.serviceRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão total</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.commissionTotal)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Base concluída</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.completedServiceRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão concluída</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.completedCommissionTotal)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão gerada</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.generatedCommissionTotal)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão pendente</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.pendingCommissionTotal)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão vencida</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.overdueCommissionTotal)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Comissão paga</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.paidCommissionTotal)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Serviços em OS ativas</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.activeRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Serviços concluídos</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.completedRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Serviços atribuídos</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.totalRevenue)}
          </p>
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Distribuição por status</h2>
          <p className="text-xs text-muted-foreground">
            Quantidade de OS e valor dos serviços vinculados ao mecânico.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {data.statusSummary.map((item) => {
            const statusOption = getServiceOrderStatusOption(item.status);

            return (
              <div key={item.status} className="rounded-md border bg-muted/20 p-3">
                <Badge variant={statusOption.variant} className={statusOption.className}>
                  {statusOption.label}
                </Badge>
                <p className="mt-3 text-xl font-semibold text-foreground">{item.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.total)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Serviços detalhados</h2>
          <p className="text-xs text-muted-foreground">
            Itens de serviço atribuídos ao mecânico, com catálogo, setor e base de comissão.
          </p>
        </div>
        <ServiceItemsTable items={data.recentItems} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Comissões financeiras</h2>
          <p className="text-xs text-muted-foreground">
            Contas a pagar de comissão geradas para as OS deste mecânico.
          </p>
        </div>
        <CommissionAccountsTable orders={data.recentOrders} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">O que está com ele agora</h2>
          <p className="text-xs text-muted-foreground">
            OS abertas, em execução, pendentes ou aguardando peças com serviços dele.
          </p>
        </div>
        <OrdersTable orders={data.activeOrders} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Rastreabilidade completa</h2>
          <p className="text-xs text-muted-foreground">
            OS com serviços vinculados ao mecânico, incluindo concluídas e canceladas.
          </p>
        </div>
        <OrdersTable orders={data.recentOrders} />
      </section>
    </section>
  );
}
