"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, FilePenLine, FileText, Mail, MessageCircle, X } from "lucide-react";

import { convertEstimate, fetchEstimate, updateEstimateStatus } from "../../estimate-api";
import { getEstimateStatusOption } from "../../status";
import type { Estimate, EstimateStatus } from "../../types";
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

const approvalTerms = [
  "Nenhum serviço, peça, produto ou procedimento adicional será executado sem aprovação prévia do cliente.",
  "Este orçamento contempla somente os itens descritos. Novas necessidades identificadas durante diagnóstico, desmontagem ou execução serão informadas antes de qualquer cobrança extra.",
  "Valores de peças e produtos estão sujeitos à disponibilidade do fornecedor e à validade informada neste orçamento.",
  "A execução dos serviços começa somente após aprovação formal do orçamento pelo cliente.",
  "A retirada do veículo poderá depender da quitação dos valores aprovados e executados.",
];

function buildVehicleLabel(estimate: Estimate) {
  return [
    estimate.vehicle?.plate,
    estimate.vehicle?.brand,
    estimate.vehicle?.model,
    estimate.vehicle?.version,
  ].filter(Boolean).join(" - ");
}

function formatVehicleYear(estimate: Estimate) {
  const manufactureYear = estimate.vehicle?.manufactureYear;
  const modelYear = estimate.vehicle?.modelYear;

  if (manufactureYear && modelYear) {
    return `${manufactureYear}/${modelYear}`;
  }

  return manufactureYear || modelYear ? String(manufactureYear ?? modelYear) : "-";
}

function buildEstimateMessage(estimate: Estimate) {
  const vehicle = buildVehicleLabel(estimate);
  const items = (estimate.items ?? []).map((item, index) => {
    return `${index + 1}. ${item.description} | Qtd: ${item.quantity} | Unit.: ${formatCurrency(
      item.unitPrice
    )} | Total: ${formatCurrency(item.total)}`;
  });
  const mechanic = estimate.convertedServiceOrder?.mechanic?.name;

  return [
    `Olá, segue o orçamento #${estimate.code}.`,
    "",
    `Cliente: ${estimate.client?.name ?? "-"}`,
    `Veículo: ${vehicle || "-"}`,
    mechanic ? `Mecânico: ${mechanic}` : null,
    `Validade: ${formatDate(estimate.validUntil)}`,
    `Total: ${formatCurrency(estimate.total)}`,
    "",
    "Produtos e serviços:",
    ...(items.length > 0 ? items : ["-"]),
    "",
    "Condições:",
    "Nenhum serviço, peça ou valor adicional será executado/cobrado sem aprovação prévia.",
    "Itens fora deste orçamento serão informados antes da execução.",
    "",
    "Qualquer dúvida, fico à disposição.",
  ].filter((line) => line !== null).join("\n");
}

type EstimateDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EstimateDetailsPage({ params }: EstimateDetailsPageProps) {
  const { id } = use(params);
  const [copiedShareText, setCopiedShareText] = useState(false);
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Carregando orçamento...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Não foi possível carregar o orçamento.
      </div>
    );
  }

  const statusOption = getEstimateStatusOption(data.status);
  const canConvert = !data.convertedServiceOrderId && data.status === "APROVADO";
  const mutationError = statusMutation.error ?? convertMutation.error;
  const shareText = buildEstimateMessage(data);
  const encodedShareText = encodeURIComponent(shareText);
  const emailHref = `mailto:?subject=${encodeURIComponent(
    `Orçamento #${data.code}`
  )}&body=${encodedShareText}`;
  const whatsappHref = `https://wa.me/?text=${encodedShareText}`;

  function handleExportPdf() {
    window.print();
  }

  async function handleCopyShareText() {
    await navigator.clipboard.writeText(shareText);
    setCopiedShareText(true);
    window.setTimeout(() => setCopiedShareText(false), 1800);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="mb-1 h-0.5 w-8 rounded-full bg-primary" />
            <h1 className="font-heading text-3xl font-800 uppercase tracking-wide text-foreground">
              Orçamento #{data.code}
            </h1>
            <p className="text-sm text-muted-foreground">
              Proposta comercial para aprovação antes da ordem de serviço.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusOption.variant} className={statusOption.className}>
            {statusOption.label}
          </Badge>
          <Button type="button" variant="outline" className="h-8 gap-2" onClick={handleExportPdf}>
            <Download className="size-3.5" />
            Exportar PDF
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-8 gap-2"
            disabled={statusMutation.isPending || data.status === "APROVADO"}
            onClick={() => statusMutation.mutate("APROVADO")}
          >
            <Check className="size-3.5" />
            Aprovar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-8 gap-2"
            disabled={statusMutation.isPending || data.status === "REJEITADO"}
            onClick={() => statusMutation.mutate("REJEITADO")}
          >
            <X className="size-3.5" />
            Rejeitar
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 gap-2"
            disabled={!canConvert || convertMutation.isPending}
            onClick={() => convertMutation.mutate()}
          >
            <FileText className="size-3.5" />
            Gerar OS
          </Button>
          <Button variant="outline" asChild className="h-8 gap-2">
            <Link href={`/orcamentos/${data.id}`}>
              <FilePenLine className="size-3.5" />
              Editar
            </Link>
          </Button>
          {data.convertedServiceOrder ? (
            <Button variant="outline" asChild className="h-8">
              <Link href={`/ordens-servico/${data.convertedServiceOrder.id}/detalhes`}>
                Ver OS {data.convertedServiceOrder.code}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {mutationError ? (
        <div className="no-print rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {mutationError instanceof Error
            ? mutationError.message
            : "Não foi possível atualizar o orçamento."}
        </div>
      ) : null}

      <section className="no-print rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-sm font-700 uppercase tracking-wide text-foreground">
              Enviar ao cliente
            </h2>
            <p className="text-xs text-muted-foreground">
              Use o canal preferido e anexe o PDF salvo quando precisar enviar o documento completo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-8 gap-2" onClick={handleExportPdf}>
              <Download className="size-3.5" />
              PDF
            </Button>
            <Button variant="outline" asChild className="h-8 gap-2">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild className="h-8 gap-2">
              <a href={emailHref}>
                <Mail className="size-3.5" />
                E-mail
              </a>
            </Button>
            <Button type="button" variant="secondary" className="h-8 gap-2" onClick={handleCopyShareText}>
              {copiedShareText ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedShareText ? "Copiado" : "Copiar texto"}
            </Button>
          </div>
        </div>
      </section>

      <article className="print-page rounded-lg border border-border bg-card p-5 shadow-sm">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proposta comercial
            </p>
            <h2 className="mt-1 font-heading text-2xl font-800 uppercase tracking-wide text-foreground">
              Orçamento #{data.code}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Documento para análise e aprovação dos serviços e peças descritos abaixo.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <Badge variant={statusOption.variant} className={statusOption.className}>
              {statusOption.label}
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">Emitido em</p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatDateTime(data.createdAt)}
            </p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 rounded-lg border border-border bg-background/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-semibold text-foreground">{data.client?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Veículo</p>
            <p className="text-sm font-semibold text-foreground">
              {buildVehicleLabel(data) || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Responsável</p>
            <p className="text-sm font-semibold text-foreground">{data.responsible}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-sm font-semibold text-foreground">{data.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Validade</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDate(data.validUntil)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Itens</p>
            <p className="text-sm font-semibold text-foreground">
              {(data.items ?? []).length} item(ns)
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ano</p>
            <p className="text-sm font-semibold text-foreground">
              {formatVehicleYear(data)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cor</p>
            <p className="text-sm font-semibold text-foreground">
              {data.vehicle?.color ?? "-"}
            </p>
          </div>
          {data.convertedServiceOrder ? (
            <div>
              <p className="text-xs text-muted-foreground">Mecânico</p>
              <p className="text-sm font-semibold text-foreground">
                {data.convertedServiceOrder.mechanic?.name ?? "-"}
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-sm font-700 uppercase tracking-wide text-foreground">
                Produtos e serviços
              </h3>
              <p className="text-xs text-muted-foreground">
                Peças, produtos e mão de obra previstos para execução após aprovação.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total da nota</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatCurrency(totals.total)}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Qtd
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Valor
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Desconto
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.items ?? []).map((item) => (
                  <TableRow key={item.id} className="hover:bg-transparent">
                    <TableCell className="font-medium text-foreground">{item.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(item.discount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Observação para o cliente
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">
              {data.notesClient ?? "-"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Desconto</span>
              <span className="font-mono font-semibold text-foreground">
                -{formatCurrency(totals.discountTotal)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-mono text-lg font-bold text-foreground">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Condições de aprovação
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {approvalTerms.map((term) => (
              <li key={term} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 grid gap-5 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aceite do cliente
            </p>
            <div className="mt-10 border-t border-foreground/40 pt-2">
              <p className="font-medium text-foreground">Assinatura do cliente</p>
              <p className="text-xs text-muted-foreground">
                Declaro estar ciente e de acordo com os itens e condições deste orçamento.
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data de aprovação
            </p>
            <div className="mt-10 border-t border-foreground/40 pt-2">
              <p className="font-medium text-foreground">____ / ____ / ______</p>
              <p className="text-xs text-muted-foreground">
                Aprovação presencial, por mensagem ou por outro meio registrado.
              </p>
            </div>
          </div>
        </section>

        <section className="no-print mt-5 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observação interna
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">
            {data.notesInternal ?? "-"}
          </p>
        </section>
      </article>
    </section>
  );
}
