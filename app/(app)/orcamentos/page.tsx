"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";

import { convertEstimate, fetchEstimate, fetchEstimates, updateEstimateStatus } from "./estimate-api";
import { buildEstimateShareLinks, getEstimatePrintHref } from "./share";
import { estimateStatusOptions, getEstimateStatusOption } from "./status";
import type { Estimate, EstimateStatus, EstimateVisibility } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/ui/header";
import { useToast } from "@/components/ui/toast";

const PAGE_SIZE = 10;

type StatusFilter = EstimateStatus | "TODOS";

const estimateVisibilityOptions: Array<{
  value: EstimateVisibility;
  label: string;
}> = [
  { value: "ATIVOS", label: "Em andamento" },
  { value: "ARQUIVADOS", label: "Arquivados" },
  { value: "TODOS", label: "Todos" },
];

const archivedOrderStatuses = ["FINALIZADA", "PAGA", "CANCELADA"] as const;

function serviceOrderStatusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    ABERTA: "Aberta",
    EM_ANDAMENTO: "Em andamento",
    AGUARDANDO_PECAS: "Aguardando peças",
    IMPEDIDA: "Impedida",
    FINALIZADA: "Finalizada",
    CANCELADA: "Cancelada",
    PAGA: "Paga",
  };

  return status ? labels[status] ?? status : "-";
}

function isArchivedEstimate(estimate: Estimate) {
  return (
    estimate.status === "REJEITADO" ||
    estimate.status === "CANCELADO" ||
    Boolean(
      estimate.convertedServiceOrder?.status &&
        archivedOrderStatuses.includes(
          estimate.convertedServiceOrder.status as (typeof archivedOrderStatuses)[number],
        ),
    )
  );
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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);

  if (isoDate) {
    const [year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatVehicle(estimate: Estimate) {
  return [
    estimate.vehicle?.plate,
    estimate.vehicle?.brand,
    estimate.vehicle?.model,
    estimate.vehicle?.version,
  ]
    .filter(Boolean)
    .join(" - ");
}

function EstimateSendMenu({
  estimate,
  disabled,
  onMarkSent,
  onOpenShare,
}: {
  estimate: Estimate;
  disabled?: boolean;
  onMarkSent: () => void;
  onOpenShare: (estimate: Estimate) => void;
}) {
  const sentStatusDisabled = disabled || estimate.status === "ENVIADO" || estimate.status === "CONVERTIDO";

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs font-medium"
        disabled={sentStatusDisabled}
        onClick={onMarkSent}
      >
        <Check className="size-3.5" />
        Marcar enviado
      </Button>
    </div>
  );
}

function EstimateSendPanel({
  estimate,
  disabled,
  onOpenPrint,
  onMarkSent,
}: {
  estimate: Estimate;
  disabled?: boolean;
  onOpenPrint: (estimate: Estimate) => void;
  onMarkSent: () => void;
}) {
  const { emailHref, whatsappHref } = buildEstimateShareLinks(estimate);
  const sentStatusDisabled = disabled || estimate.status === "ENVIADO" || estimate.status === "CONVERTIDO";

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-xs font-700 uppercase tracking-wide text-foreground">
            Enviar ao cliente
          </p>
          <p className="text-xs text-muted-foreground">
            Compartilhe o orçamento como PDF, WhatsApp ou e-mail.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-2"
            onClick={() => onOpenPrint(estimate)}
          >
            <Download className="size-3.5" />
            PDF
          </Button>
          <Button asChild variant="outline" className="h-8 gap-2">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" className="h-8 gap-2">
            <a href={emailHref}>
              <Mail className="size-3.5" />
              E-mail
            </a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 gap-2"
            disabled={sentStatusDisabled}
            onClick={onMarkSent}
          >
            <Send className="size-3.5" />
            Marcar enviado
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EstimatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [visibility, setVisibility] = useState<EstimateVisibility>("ATIVOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [shareEstimate, setShareEstimate] = useState<Estimate | null>(null);
  const [printEstimate, setPrintEstimate] = useState<Estimate | null>(null);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const { toast } = useToast();

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["estimates", { page, status, search, visibility }],
    queryFn: () =>
      fetchEstimates({
        page,
        pageSize: PAGE_SIZE,
        status,
        search,
        visibility,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const {
    data: selectedEstimate,
    isLoading: isLoadingDetails,
    isError: isDetailsError,
    error: detailsError,
  } = useQuery({
    queryKey: ["estimate", selectedEstimateId],
    queryFn: () => fetchEstimate(selectedEstimateId as string),
    enabled: Boolean(selectedEstimateId),
  });


  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      updateEstimateStatus(id, { status }),
    onSuccess: (estimate, variables) => {
      queryClient.setQueryData(["estimate", estimate.id], estimate);
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({
        title:
          variables.status === "APROVADO"
            ? "Orçamento aprovado"
            : variables.status === "ENVIADO"
              ? "Orçamento enviado"
              : "Orçamento recusado",
        description: "O status do orçamento foi atualizado.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar orçamento",
        description:
          error instanceof Error ? error.message : "Não foi possível atualizar o orçamento.",
        variant: "destructive",
      });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convertEstimate(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.setQueryData(["estimate", result.estimate.id], result.estimate);
      toast({
        title: "Orçamento convertido",
        description: "A ordem de serviço foi criada com sucesso.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível converter o orçamento.";
      toast({
        title: "Erro ao converter orçamento",
        description: message,
        variant: "destructive",
      });
    },
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const showInitialLoading = isLoading;
  const showBackgroundLoading = isFetching && !isLoading;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatus(value as StatusFilter);
    setPage(1);
  }

  function handleVisibilityChange(value: string) {
    setVisibility(value as EstimateVisibility);
    setPage(1);
  }

  const selectedStatusOption = selectedEstimate
    ? getEstimateStatusOption(selectedEstimate.status)
    : null;
  const isUpdatingSelected =
    statusMutation.isPending && statusMutation.variables?.id === selectedEstimateId;
  const isConvertingSelected =
    convertMutation.isPending && convertMutation.variables === selectedEstimateId;
  const canConvertSelected =
    Boolean(selectedEstimate) &&
    !selectedEstimate?.convertedServiceOrderId &&
    selectedEstimate?.status === "APROVADO";
  const shareLinks = shareEstimate ? buildEstimateShareLinks(shareEstimate) : null;
  const shareText = shareLinks?.text ?? "";
  const shareSentDisabled =
    shareEstimate?.status === "ENVIADO" || shareEstimate?.status === "CONVERTIDO";
  const printHref = printEstimate ? getEstimatePrintHref(printEstimate.id) : null;

  async function handleCopyShareText() {
    if (!shareText) {
      return;
    }
    await navigator.clipboard.writeText(shareText);
    setCopiedShareText(true);
    window.setTimeout(() => setCopiedShareText(false), 1800);
  }

  function handlePrintPreview() {
    const frameWindow = printFrameRef.current?.contentWindow;
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Orçamentos"
          description="Busque propostas, aprove valores e converta em ordem de serviço."
        />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/orcamentos/novo">
            <Plus className="size-3.5" />
            Cadastrar orçamento
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <Input
            placeholder="Buscar por cliente, veículo, mecânico, setor, responsável ou número..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="w-full sm:w-56">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {estimateStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-56">
          <Select value={visibility} onValueChange={handleVisibilityChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Exibição" />
            </SelectTrigger>
            <SelectContent>
              {estimateVisibilityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="h-9 gap-2 px-5 font-medium"
        >
          <Search className="size-3.5" />
          Buscar
        </Button>
      </form>

      <div className="flex min-h-[560px] flex-col gap-4">
        {showInitialLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando orçamentos...
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar orçamentos."}
          </div>
        )}

        {showBackgroundLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-8 text-sm text-muted-foreground shadow-sm">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Atualizando orçamentos...
          </div>
        ) : null}

        {data && data.items.length === 0 && !isFetching && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <FileText className="size-8 opacity-40" strokeWidth={1.5} />
            Nenhum orçamento encontrado para os filtros aplicados.
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {showBackgroundLoading ? (
              <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary/70" />
            ) : null}

            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Número
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Veículo
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Mecânico
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Serviços
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Desconto
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Total
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Validade
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.items.map((estimate) => {
                  const statusOption = getEstimateStatusOption(estimate.status);
                  const isUpdatingRow =
                    statusMutation.isPending && statusMutation.variables?.id === estimate.id;
                  const archived = isArchivedEstimate(estimate);

                  return (
                    <TableRow
                      key={estimate.id}
                      className={`group transition-colors hover:bg-accent/40 ${
                        archived ? "bg-muted/20 opacity-75" : ""
                      }`}
                    >
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        #{estimate.code}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          href={estimate.client?.id ? `/clientes/${estimate.client.id}` : "#"}
                          className="block truncate font-medium text-foreground hover:text-primary"
                          title={estimate.client?.name ?? undefined}
                        >
                          {estimate.client?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-56 text-muted-foreground">
                        <span
                          className="block truncate"
                          title={estimate.vehicle?.model ?? undefined}
                        >
                          {estimate.vehicle?.plate ?? "-"}
                          {estimate.vehicle?.model ? ` - ${estimate.vehicle.model}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-48 text-muted-foreground">
                        <span
                          className="block truncate"
                          title={estimate.mechanic?.name ?? undefined}
                        >
                          {estimate.mechanic?.name ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge
                            variant={statusOption.variant}
                            className={statusOption.className}
                          >
                            {statusOption.label}
                          </Badge>
                          {estimate.convertedServiceOrder ? (
                            <span className="text-xs text-muted-foreground">
                              OS #{estimate.convertedServiceOrder.code} -{" "}
                              {serviceOrderStatusLabel(
                                estimate.convertedServiceOrder.status,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatCurrency(estimate.subtotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatCurrency(estimate.discountTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                        {formatCurrency(estimate.total)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDate(estimate.validUntil)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs font-medium"
                            onClick={() => setSelectedEstimateId(estimate.id)}
                          >
                            <FileText className="size-3" />
                            Detalhes
                          </Button>

                          <EstimateSendMenu
                            estimate={estimate}
                            disabled={isUpdatingRow}
                            onOpenShare={(nextEstimate) => {
                              setShareEstimate(nextEstimate);
                              setCopiedShareText(false);
                            }}
                            onMarkSent={() =>
                              statusMutation.mutate({ id: estimate.id, status: "ENVIADO" })
                            }
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title="Editar orçamento"
                            className="h-7 gap-1 px-2 text-xs font-medium"
                          >
                            <Link href={`/orcamentos/${estimate.id}`}>
                              <Pencil className="size-3.5" />
                              Editar
                            </Link>
                          </Button>

                          {estimate.convertedServiceOrder ? (
                            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                              <Link
                                href={`/ordens-servico/${estimate.convertedServiceOrder.id}/detalhes`}
                              >
                                OS {estimate.convertedServiceOrder.code}
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {convertMutation.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {convertMutation.error instanceof Error
              ? convertMutation.error.message
              : "Não foi possível gerar a OS."}
          </div>
        ) : null}
      </div>

      {data && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{data.page ?? page}</span>{" "}
            de <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} orçamentos` : ""}
            {visibility === "ATIVOS"
              ? " em andamento"
              : visibility === "ARQUIVADOS"
                ? " arquivados"
                : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="h-8 gap-1 px-3 text-xs"
            >
              <ChevronLeft className="size-3" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="h-8 gap-1 px-3 text-xs"
            >
              Próxima
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(printEstimate)}
        onOpenChange={(open) => {
          if (!open) {
            setPrintEstimate(null);
          }
        }}
      >
        <DialogContent className="gap-4 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pré-visualizar orçamento</DialogTitle>
            <DialogDescription>
              Confira o documento antes de imprimir ou salvar como PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              ref={printFrameRef}
              title="Prévia do orçamento"
              src={printHref ?? "#"}
              className="h-[70vh] w-full bg-white"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" className="h-9 gap-2" onClick={handlePrintPreview}>
              <Download className="size-3.5" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedEstimateId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEstimateId(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold">
                  {selectedEstimate ? `Orçamento #${selectedEstimate.code}` : "Detalhes do orçamento"}
                </DialogTitle>
                <DialogDescription>
                  {selectedEstimate
                    ? `${selectedEstimate.client?.name ?? "-"} • ${formatVehicle(selectedEstimate) || "-"}`
                    : "Carregando dados completos do orçamento."}
                </DialogDescription>
              </div>
              {selectedStatusOption ? (
                <Badge
                  variant={selectedStatusOption.variant}
                  className={`w-fit ${selectedStatusOption.className ?? ""}`}
                >
                  {selectedStatusOption.label}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>

          <div className="max-h-[calc(92vh-9rem)] overflow-y-auto px-5 py-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Carregando detalhes...
              </div>
            ) : null}

            {isDetailsError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {detailsError instanceof Error
                  ? detailsError.message
                  : "Não foi possível carregar o orçamento."}
              </div>
            ) : null}

            {selectedEstimate ? (
              <div className="flex flex-col gap-5">
                <EstimateSendPanel
                  estimate={selectedEstimate}
                  disabled={isUpdatingSelected}
                  onOpenPrint={(estimate) => {
                    setPrintEstimate(estimate);
                  }}
                  onMarkSent={() =>
                    statusMutation.mutate({ id: selectedEstimate.id, status: "ENVIADO" })
                  }
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedEstimate.client?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatVehicle(selectedEstimate) || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Validade</p>
                    <p className="mt-1 font-mono font-medium text-foreground">
                      {formatDate(selectedEstimate.validUntil)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Mecânico</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedEstimate.mechanic?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Setor</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedEstimate.items?.find((item) => item.sector?.name)?.sector?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedEstimate.responsible}
                    </p>
                  </div>
                  {selectedEstimate.convertedServiceOrder ? (
                    <div className="rounded-lg border border-border p-3 md:col-span-3">
                      <p className="text-xs text-muted-foreground">Ordem de serviço convertida</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          OS #{selectedEstimate.convertedServiceOrder.code} -{" "}
                          {serviceOrderStatusLabel(
                            selectedEstimate.convertedServiceOrder.status,
                          )}
                        </p>
                        <Button asChild variant="outline" className="h-7 px-2 text-xs">
                          <Link
                            href={`/ordens-servico/${selectedEstimate.convertedServiceOrder.id}/detalhes`}
                          >
                            Ver OS
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60 hover:bg-muted/60">
                        <TableHead>Item</TableHead>
                        <TableHead>Mecânico</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Unitário</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Base comissão</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedEstimate.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{item.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.catalogItem?.name ?? "Item sem catálogo"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.mechanic?.name ?? selectedEstimate.mechanic?.name ?? "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.discount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(
                              item.commissionBase ??
                                (item.catalogItem?.type === "SERVICO" ? item.total : "0")
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="mt-1 font-mono text-base font-semibold">
                      {formatCurrency(selectedEstimate.subtotal)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Desconto</p>
                    <p className="mt-1 font-mono text-base font-semibold">
                      {formatCurrency(selectedEstimate.discountTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="mt-1 font-mono text-base font-semibold text-primary">
                      {formatCurrency(selectedEstimate.total)}
                    </p>
                  </div>
                </div>

                {(selectedEstimate.notesClient || selectedEstimate.notesInternal) ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Observações para o cliente</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {selectedEstimate.notesClient || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Observações internas</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {selectedEstimate.notesInternal || "-"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {selectedEstimate ? (
            <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="h-8 gap-2"
                  disabled={
                    isUpdatingSelected ||
                    selectedEstimate.status === "APROVADO" ||
                    selectedEstimate.status === "CONVERTIDO"
                  }
                  onClick={() =>
                    statusMutation.mutate({ id: selectedEstimate.id, status: "APROVADO" })
                  }
                >
                  <Check className="size-3.5" />
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-8 gap-2"
                  disabled={
                    isUpdatingSelected ||
                    selectedEstimate.status === "REJEITADO" ||
                    selectedEstimate.status === "CONVERTIDO"
                  }
                  onClick={() =>
                    statusMutation.mutate({ id: selectedEstimate.id, status: "REJEITADO" })
                  }
                >
                  <X className="size-3.5" />
                  Recusar
                </Button>
                {selectedEstimate.convertedServiceOrder ? (
                  <Button asChild variant="outline" className="h-8">
                    <Link href={`/ordens-servico/${selectedEstimate.convertedServiceOrder.id}/detalhes`}>
                      Ver OS {selectedEstimate.convertedServiceOrder.code}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 gap-2"
                    disabled={!canConvertSelected || isConvertingSelected}
                    onClick={() => convertMutation.mutate(selectedEstimate.id)}
                  >
                    <FileText className="size-3.5" />
                    Gerar OS
                  </Button>
                )}
              </div>

              <Button asChild variant="outline" className="h-8 gap-2">
                <Link href={`/orcamentos/${selectedEstimate.id}`}>
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
