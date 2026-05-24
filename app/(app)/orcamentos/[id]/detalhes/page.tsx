"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fraunces, Sora } from "next/font/google";

import { convertEstimate, fetchEstimate, updateEstimateStatus } from "../../estimate-api";
import { getEstimateStatusOption } from "../../status";
import type { EstimateStatus } from "../../types";
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

type EstimateDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EstimateDetailsPage({ params }: EstimateDetailsPageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["estimate", id],
    queryFn: () => fetchEstimate(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: EstimateStatus) => updateEstimateStatus(id, { status }),
    onSuccess: (estimate) => {
      queryClient.setQueryData(["estimate", id], estimate);
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertEstimate(id),
    onSuccess: (result) => {
      queryClient.setQueryData(["estimate", id], result.estimate);
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
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
        Carregando orÃ§amento...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        NÃ£o foi possÃ­vel carregar o orÃ§amento.
      </div>
    );
  }

  const statusOption = getEstimateStatusOption(data.status);
  const canConvert =
    !data.convertedServiceOrderId &&
    data.status === "APROVADO";
  const mutationError = statusMutation.error ?? convertMutation.error;

  return (
    <div className={`${bodyFont.className} border bg-white p-6 shadow-sm`}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              OrÃ§amento #{data.code}
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              Detalhes do orÃ§amento
            </h1>
            <p className="text-sm text-muted-foreground">
              Proposta comercial para aprovaÃ§Ã£o antes da ordem de serviÃ§o.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusOption.variant} className={statusOption.className}>
              {statusOption.label}
            </Badge>
            <Button
              variant="default"
              disabled={statusMutation.isPending || data.status === "APROVADO"}
              onClick={() => statusMutation.mutate("APROVADO")}
            >
              Aprovar
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending || data.status === "REJEITADO"}
              onClick={() => statusMutation.mutate("REJEITADO")}
            >
              Rejeitar
            </Button>
            <Button
              variant="secondary"
              disabled={!canConvert || convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              Gerar OS
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/orcamentos/${data.id}`}>Editar</Link>
            </Button>
            {data.convertedServiceOrder ? (
              <Button variant="outline" asChild>
                <Link href={`/ordens-servico/${data.convertedServiceOrder.id}/detalhes`}>
                  Ver OS {data.convertedServiceOrder.code}
                </Link>
              </Button>
            ) : null}
          </div>
        </header>

        {mutationError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {mutationError instanceof Error
              ? mutationError.message
              : "NÃ£o foi possÃ­vel atualizar o orÃ§amento."}
          </div>
        ) : null}

        <section className="grid gap-4 border bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-semibold text-foreground">{data.client?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">VeÃ­culo</p>
            <p className="text-sm font-semibold text-foreground">
              {data.vehicle?.plate ?? "-"}
              {data.vehicle?.model ? ` - ${data.vehicle.model}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ResponsÃ¡vel</p>
            <p className="text-sm font-semibold text-foreground">{data.responsible}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-sm font-semibold text-foreground">{data.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Validade</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDateTime(data.validUntil)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Criado em</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDateTime(data.createdAt)}
            </p>
          </div>
        </section>

        <section className="border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">ServiÃ§os e peÃ§as</h2>
              <p className="text-xs text-muted-foreground">
                {(data.items ?? []).length} item(ns) cadastrados
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs text-muted-foreground">Total da nota</p>
              <p className="text-base font-semibold text-foreground">
                {formatCurrency(totals.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DescriÃ§Ã£o</TableHead>
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
              <span className="text-muted-foreground">Total serviÃ§os</span>
              <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <span className="font-semibold">-{formatCurrency(totals.discountTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total da nota</span>
              <span className="font-semibold">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border bg-white p-5 shadow-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">ObservaÃ§Ã£o interna</p>
            <p className="text-sm font-semibold text-foreground">
              {data.notesInternal ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ObservaÃ§Ã£o para o cliente</p>
            <p className="text-sm font-semibold text-foreground">
              {data.notesClient ?? "-"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
