"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { fetchMechanicReport } from "../../mechanic-api";
import type { MechanicReportOrder } from "../../types";
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

function formatVehicle(order: MechanicReportOrder) {
  if (!order.vehicle) {
    return "-";
  }

  return `${order.vehicle.plate}${order.vehicle.model ? ` - ${order.vehicle.model}` : ""}`;
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
            <TableHead className="text-right">Serviços</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-right">Total</TableHead>
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
    { label: "OS atribuídas", value: data.summary.totalOrders },
    { label: "Em aberto agora", value: data.summary.activeOrders },
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
            description="Rastreabilidade de serviços, carga atual e histórico de OS."
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

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Serviços movimentados</p>
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
          <p className="text-xs text-muted-foreground">Serviços concluídos</p>
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

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Valor em OS ativas</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.activeRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Valor concluído</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.completedRevenue)}
          </p>
        </div>
        <div className="rounded-md border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Valor total atribuído</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(data.summary.totalRevenue)}
          </p>
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Distribuição por status</h2>
          <p className="text-xs text-muted-foreground">
            Quantidade e valor das OS que já passaram pelo mecânico.
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
          <h2 className="text-sm font-semibold text-foreground">O que está com ele agora</h2>
          <p className="text-xs text-muted-foreground">
            OS abertas, em execução, pendentes ou aguardando peças.
          </p>
        </div>
        <OrdersTable orders={data.activeOrders} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Rastreabilidade recente</h2>
          <p className="text-xs text-muted-foreground">
            Últimas OS atribuídas ao mecânico, incluindo concluídas e canceladas.
          </p>
        </div>
        <OrdersTable orders={data.recentOrders} />
      </section>
    </section>
  );
}
