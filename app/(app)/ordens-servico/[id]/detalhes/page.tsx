"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fraunces, Sora } from "next/font/google";

import { fetchServiceOrder, updateServiceOrderStatus } from "../../service-order-api";
import { getServiceOrderStatusOption } from "../../status";
import type { ServiceOrderStatus } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const titleFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Sora({ subsets: ["latin"], weight: ["400", "500", "600"] });

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

type ServiceOrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ServiceOrderDetailsPage({ params }: ServiceOrderDetailsPageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["service-order", id],
    queryFn: () => fetchServiceOrder(id),
  });
  const statusMutation = useMutation({
    mutationFn: (status: ServiceOrderStatus) => updateServiceOrderStatus(id, { status }),
    onSuccess: (order) => {
      queryClient.setQueryData(["service-order", id], order);
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });

  const totals = useMemo(() => {
    if (!data) {
      return { subtotal: "0", discountTotal: "0", total: "0" };
    }
    return {
      subtotal: data.subtotal,
      discountTotal: data.discountTotal,
      total: data.total,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando ordem de servico...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Nao foi possivel carregar a ordem de servico.
      </div>
    );
  }

  const statusOption = getServiceOrderStatusOption(data.status);
  const isChangingStatus = statusMutation.isPending;

  return (
    <div
      className={`${bodyFont.className} relative overflow-hidden rounded-[32px] border bg-white/80 p-6 shadow-lg backdrop-blur`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-slate-100/70 via-transparent to-sky-100/70" />

      <div className="relative z-10 space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Ordem #{data.code}
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              Detalhes da ordem de servico
            </h1>
            <p className="text-sm text-muted-foreground">
              Informacoes completas para acompanhamento da OS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusOption.variant} className={statusOption.className}>
              {statusOption.label}
            </Badge>
            <Button
              variant="default"
              disabled={isChangingStatus || data.status === "FINALIZADA"}
              onClick={() => statusMutation.mutate("FINALIZADA")}
            >
              Aprovar conclusao
            </Button>
            <Button
              variant="secondary"
              disabled={isChangingStatus || data.status === "AGUARDANDO_PECAS"}
              onClick={() => statusMutation.mutate("AGUARDANDO_PECAS")}
            >
              Aguardando pecas
            </Button>
            <Button
              variant="destructive"
              disabled={isChangingStatus || data.status === "IMPEDIDA"}
              onClick={() => statusMutation.mutate("IMPEDIDA")}
            >
              Impedimento
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/ordens-servico/${data.id}`}>Editar</Link>
            </Button>
          </div>
        </header>

        {statusMutation.error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : "Nao foi possivel alterar o status."}
          </div>
        ) : null}

        <section className="grid gap-4 rounded-2xl border bg-white/90 p-5 shadow-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-semibold text-foreground">
              {data.client?.name ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Veiculo</p>
            <p className="text-sm font-semibold text-foreground">
              {data.vehicle?.plate ?? "-"}
              {data.vehicle?.model ? ` - ${data.vehicle.model}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Responsavel</p>
            <p className="text-sm font-semibold text-foreground">{data.responsible}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDateTime(data.entryAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Previsto</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDateTime(data.estimatedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Localizacao</p>
            <p className="text-sm font-semibold text-foreground">{data.location ?? "-"}</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Itens e servicos</h2>
              <p className="text-xs text-muted-foreground">
                {(data.items ?? []).length} item(ns) cadastrados
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-semibold text-foreground">
                {formatCurrency(totals.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(item.discount)}</TableCell>
                    <TableCell>{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Descontos</span>
              <span className="font-semibold">-{formatCurrency(totals.discountTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total final</span>
              <span className="font-semibold">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border bg-white/90 p-5 shadow-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Observacao interna</p>
            <p className="text-sm font-semibold text-foreground">
              {data.notesInternal ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Observacao para o cliente</p>
            <p className="text-sm font-semibold text-foreground">
              {data.notesClient ?? "-"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
