"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/ui/header";
import {
  fetchServiceOrders,
  updateServiceOrderStatus,
} from "@/app/(app)/ordens-servico/service-order-api";
import { fetchEstimates } from "@/modules/estimate/api/estimate.service";
import { getEstimateStatusOption } from "@/modules/estimate/utils/estimate-status";
import type {
  Estimate,
  EstimateStatus,
} from "@/modules/estimate/types/estimate.types";
import {
  getServiceOrderStatusOption,
  serviceOrderStatusOptions,
} from "@/app/(app)/ordens-servico/status";
import type {
  ServiceOrder,
  ServiceOrderStatus,
  StatusFilter,
} from "../../types/order-service.types";
import {
  archivedBoardColumns,
  boardColumns,
} from "../../utils/order-service.constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
type PeriodFilter = "DIA" | "SEMANA" | "MES" | "PERSONALIZADO";

const periodOptions: Array<{
  value: PeriodFilter;
  label: string;
  summaryLabel: string;
}> = [
  { value: "DIA", label: "Dia", summaryLabel: "do dia" },
  { value: "SEMANA", label: "Semana", summaryLabel: "da semana" },
  { value: "MES", label: "Mês", summaryLabel: "do mês" },
  {
    value: "PERSONALIZADO",
    label: "Personalizado",
    summaryLabel: "do período",
  },
];

const estimateColumns: Array<{
  status: EstimateStatus;
  title: string;
  description: string;
}> = [
  {
    status: "RASCUNHO",
    title: "Orçamentos criados",
    description: "Ainda em elaboração",
  },
  {
    status: "ENVIADO",
    title: "Aguardando aprovação",
    description: "Enviados para o cliente",
  },
];

const columnMeta: Record<
  ServiceOrderStatus,
  {
    accentClassName: string;
    surfaceClassName: string;
  }
> = {
  ABERTA: {
    accentClassName: "bg-primary/55",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_16%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_6%,var(--card))]",
  },
  EM_ANDAMENTO: {
    accentClassName: "bg-primary",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_32%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))]",
  },
  AGUARDANDO_PECAS: {
    accentClassName: "bg-primary/75",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--card))]",
  },
  IMPEDIDA: {
    accentClassName: "bg-primary",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_38%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))]",
  },
  FINALIZADA: {
    accentClassName: "bg-primary/70",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))]",
  },
  CANCELADA: {
    accentClassName: "bg-muted-foreground",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_10%,var(--border))] bg-muted",
  },
  PAGA: {
    accentClassName: "bg-primary",
    surfaceClassName:
      "border-[color-mix(in_oklab,var(--primary)_42%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))]",
  },
};

function getVehicleLabel(order: ServiceOrder) {
  const plate = order.vehicle?.plate?.trim();
  const model = order.vehicle?.model?.trim();

  if (!plate && !model) {
    return "Veículo não informado";
  }

  return [plate, model].filter(Boolean).join(" - ");
}

function getOrderSubtitle(order: ServiceOrder) {
  return order.client?.name ?? order.responsible ?? "Cliente não informado";
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(
  period: PeriodFilter,
  customRange?: { from: string; to: string },
) {
  if (period === "PERSONALIZADO") {
    const fromDate = customRange?.from
      ? new Date(`${customRange.from}T00:00:00`)
      : null;
    const toDate = customRange?.to ? new Date(`${customRange.to}T23:59:59.999`) : null;

    return {
      from:
        fromDate && !Number.isNaN(fromDate.getTime())
          ? fromDate.toISOString()
          : undefined,
      to:
        toDate && !Number.isNaN(toDate.getTime())
          ? toDate.toISOString()
          : undefined,
    };
  }

  const now = new Date();
  const from = new Date(now);
  const to = new Date(from);

  if (period === "DIA") {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  }

  if (period === "SEMANA") {
    const day = now.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    from.setDate(now.getDate() - distanceFromMonday);
    from.setHours(0, 0, 0, 0);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  }

  if (period === "MES") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(from.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  }

  to.setHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export default function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const boardPanRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [statusInput, setStatusInput] = useState<StatusFilter>("TODOS");
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [periodInput, setPeriodInput] = useState<PeriodFilter>("SEMANA");
  const [period, setPeriod] = useState<PeriodFilter>("SEMANA");
  const [customFromInput, setCustomFromInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [customToInput, setCustomToInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [customRange, setCustomRange] = useState(() => {
    const today = toDateInputValue(new Date());

    return { from: today, to: today };
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reportOrder, setReportOrder] = useState<ServiceOrder | null>(null);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] =
    useState<ServiceOrderStatus | null>(null);
  const visibleColumns = useMemo(
    () => [...boardColumns, ...archivedBoardColumns],
    [],
  );
  const periodRange = useMemo(
    () => getPeriodRange(period, customRange),
    [customRange, period],
  );
  const periodSummary =
    periodOptions.find((option) => option.value === period)?.summaryLabel ??
    "da semana";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["service-orders", { page, status, search, period, periodRange }],
    queryFn: () =>
      fetchServiceOrders({
        page,
        pageSize: PAGE_SIZE,
        status,
        search,
        includeArchived: true,
        from: periodRange.from,
        to: periodRange.to,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const {
    data: estimatesData,
    isLoading: isLoadingEstimates,
    isError: isEstimateError,
    error: estimateError,
  } = useQuery({
    queryKey: ["yard-estimates", { search, period, periodRange }],
    queryFn: () =>
      fetchEstimates({
        page: 1,
        pageSize: PAGE_SIZE,
        search,
        visibility: "ATIVOS",
        from: periodRange.from,
        to: periodRange.to,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceOrderStatus }) =>
      updateServiceOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
    onSettled: () => {
      setDraggingOrderId(null);
      setDragOverStatus(null);
    },
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const ordersByStatus = useMemo(() => {
    const grouped = new Map<ServiceOrderStatus, ServiceOrder[]>(
      visibleColumns.map((column) => [column.status, []]),
    );

    (data?.items ?? []).forEach((order) => {
      grouped.get(order.status)?.push(order);
    });

    return grouped;
  }, [data, visibleColumns]);

  const estimatesByStatus = useMemo(() => {
    const grouped = new Map<EstimateStatus, Estimate[]>(
      estimateColumns.map((column) => [column.status, []]),
    );

    (estimatesData?.items ?? []).forEach((estimate) => {
      grouped.get(estimate.status)?.push(estimate);
    });

    return grouped;
  }, [estimatesData]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setStatus(statusInput);
    setPeriod(periodInput);
    setCustomRange({
      from: customFromInput,
      to: customToInput,
    });
    setSearch(searchInput.trim());
  }

  function moveOrderToStatus(orderId: string, nextStatus: ServiceOrderStatus) {
    const order = data?.items.find((item) => item.id === orderId);

    if (!order || order.status === nextStatus || statusMutation.isPending) {
      return;
    }

    statusMutation.mutate({ id: orderId, status: nextStatus });
  }

  function handleDrop(
    event: React.DragEvent<HTMLElement>,
    nextStatus: ServiceOrderStatus,
  ) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData("text/plain") || draggingOrderId;

    setDragOverStatus(null);

    if (!orderId) {
      return;
    }

    moveOrderToStatus(orderId, nextStatus);
  }

  function handleBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("[data-service-order-card]")
    ) {
      return;
    }

    const scroller = boardScrollRef.current;

    if (!scroller) {
      return;
    }

    boardPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pan = boardPanRef.current;
    const scroller = boardScrollRef.current;

    if (!pan || !scroller || pan.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    scroller.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
  }

  function finishBoardPan(event: React.PointerEvent<HTMLDivElement>) {
    const pan = boardPanRef.current;
    const scroller = boardScrollRef.current;

    if (!pan || pan.pointerId !== event.pointerId) {
      return;
    }

    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }

    boardPanRef.current = null;
  }

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Controle de pátio"
          description="Acompanhe orçamentos e ordens de serviço por período."
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
            <Link href="/ordens-servico/novo">
              <Plus className="size-3.5" />
              Nova OS
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Atualizar ordens de serviço"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["service-orders"] });
              queryClient.invalidateQueries({ queryKey: ["yard-estimates"] });
            }}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-sm lg:flex-row lg:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por OS, cliente, veículo, placa, mecânico ou responsável"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-9 rounded-md pl-8 text-sm"
          />
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-2",
            periodInput === "PERSONALIZADO"
              ? "sm:grid-cols-[minmax(0,12rem)_minmax(0,11rem)_minmax(0,9rem)_minmax(0,9rem)_auto]"
              : "sm:grid-cols-[minmax(0,12rem)_minmax(0,11rem)_auto]",
          )}
        >
          <Select
            value={statusInput}
            onValueChange={(value) => setStatusInput(value as StatusFilter)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {serviceOrderStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={periodInput}
            onValueChange={(value) => setPeriodInput(value as PeriodFilter)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {periodInput === "PERSONALIZADO" ? (
            <>
              <Input
                type="date"
                value={customFromInput}
                onChange={(event) => setCustomFromInput(event.target.value)}
                className="h-9 text-sm"
                aria-label="Data inicial"
              />
              <Input
                type="date"
                value={customToInput}
                onChange={(event) => setCustomToInput(event.target.value)}
                className="h-9 text-sm"
                aria-label="Data final"
              />
            </>
          ) : null}

          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="h-9 gap-1"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtrar
          </Button>
        </div>
      </form>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-primary/20 bg-[color-mix(in_oklab,var(--primary)_18%,var(--card))] p-2 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-foreground">
          <div className="flex items-center gap-2 text-xs">
            <Circle className="size-2.5 fill-primary text-primary" />
            <span className="font-medium">
              {(data?.total ?? 0) + (estimatesData?.total ?? 0)} itens {periodSummary}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Arraste uma OS para outra coluna para alterar a etapa.
          </p>
        </div>

        {(isLoading || isLoadingEstimates) && (
          <div className="flex min-h-96 items-center justify-center gap-2 rounded-md border border-primary/15 bg-card/75 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando painel {periodSummary}...
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar ordens de serviço."}
          </div>
        )}

        {isEstimateError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {estimateError instanceof Error
              ? estimateError.message
              : "Erro ao carregar orçamentos."}
          </div>
        )}

        {data &&
          estimatesData &&
          data.items.length === 0 &&
          estimatesData.items.length === 0 &&
          !isLoading &&
          !isLoadingEstimates && (
          <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-primary/25 bg-card/75 px-4 text-center text-sm text-muted-foreground">
            <FileText className="size-8 opacity-60" />
            Nenhum orçamento ou ordem de serviço encontrado neste período.
          </div>
        )}

        {data && estimatesData && (data.items.length > 0 || estimatesData.items.length > 0) && (
          <div
            ref={boardScrollRef}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={finishBoardPan}
            onPointerCancel={finishBoardPan}
            className="min-h-0 flex-1 cursor-grab overflow-x-auto active:cursor-grabbing"
          >
            <div
              className={cn(
                "grid min-h-[620px] gap-2",
                "min-w-[1800px] grid-cols-9",
              )}
            >
              {estimateColumns.map((column) => {
                const estimates = estimatesByStatus.get(column.status) ?? [];
                const meta =
                  column.status === "RASCUNHO"
                    ? columnMeta.ABERTA
                    : columnMeta.EM_ANDAMENTO;

                return (
                  <section
                    key={column.status}
                    className={cn(
                      "flex min-h-0 flex-col rounded-md border p-2 transition-all",
                      meta.surfaceClassName,
                    )}
                  >
                    <header className="flex min-h-12 items-start justify-between gap-2 border-b border-black/10 pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 rounded-full",
                              meta.accentClassName,
                            )}
                            aria-hidden="true"
                          />
                          <h2 className="truncate text-xs font-semibold uppercase text-foreground">
                            {column.title}
                          </h2>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[0.6875rem] text-muted-foreground">
                          {column.description}
                        </p>
                      </div>
                      <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-card px-2 text-xs font-semibold text-foreground shadow-sm">
                        {estimates.length}
                      </span>
                    </header>

                    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                      {estimates.length === 0 ? (
                        <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-black/15 bg-white/50 px-3 text-center text-xs text-muted-foreground">
                          Nenhum orçamento nesta etapa.
                        </div>
                      ) : null}

                      {estimates.map((estimate) => {
                        const statusOption = getEstimateStatusOption(estimate.status);

                        return (
                          <article
                            key={estimate.id}
                            data-service-order-card
                            className="rounded-md border border-border bg-card p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                                ORÇ #{estimate.code}
                              </p>
                              <Badge
                                variant="outline"
                                className="max-w-24 shrink-0 truncate border-primary/20 bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] text-[0.625rem] text-foreground"
                              >
                                {statusOption.label}
                              </Badge>
                            </div>

                            <h3
                              className="mt-1 truncate text-sm font-semibold leading-tight text-foreground"
                              title={estimate.client?.name ?? "Cliente não informado"}
                            >
                              {estimate.client?.name ?? "Cliente não informado"}
                            </h3>

                            <div className="mt-1 grid gap-1 text-[0.6875rem]">
                              <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Car className="size-3.5 shrink-0" />
                                <span className="truncate font-medium text-foreground">
                                  {[estimate.vehicle?.plate, estimate.vehicle?.model]
                                    .filter(Boolean)
                                    .join(" - ") || "Veículo não informado"}
                                </span>
                              </p>
                              <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Wrench className="size-3.5 shrink-0" />
                                <span className="truncate font-medium text-foreground">
                                  {estimate.mechanic?.name ?? estimate.responsible}
                                </span>
                              </p>
                            </div>

                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 w-full"
                              >
                                <Link href={`/orcamentos/${estimate.id}/detalhes`}>
                                  <FileText className="size-3" />
                                  Detalhes
                                </Link>
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {visibleColumns.map((column) => {
                const orders = ordersByStatus.get(column.status) ?? [];
                const meta = columnMeta[column.status];

                return (
                  <section
                    key={column.status}
                    onDragOver={(event) => {
                      if (!draggingOrderId || column.status === "PAGA") {
                        return;
                      }

                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStatus(column.status);
                    }}
                    onDragLeave={(event) => {
                      if (
                        event.currentTarget.contains(
                          event.relatedTarget as Node | null,
                        )
                      ) {
                        return;
                      }

                      setDragOverStatus(null);
                    }}
                    onDrop={(event) => {
                      if (column.status === "PAGA") {
                        return;
                      }

                      handleDrop(event, column.status);
                    }}
                    className={cn(
                      "flex min-h-0 flex-col rounded-md border p-2 transition-all",
                      meta.surfaceClassName,
                      dragOverStatus === column.status &&
                        "ring-2 ring-primary ring-offset-2",
                    )}
                  >
                    <header className="flex min-h-12 items-start justify-between gap-2 border-b border-black/10 pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 rounded-full",
                              meta.accentClassName,
                            )}
                            aria-hidden="true"
                          />
                          <h2 className="truncate text-xs font-semibold uppercase text-foreground">
                            {column.title}
                          </h2>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[0.6875rem] text-muted-foreground">
                          {column.description}
                        </p>
                      </div>
                      <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-card px-2 text-xs font-semibold text-foreground shadow-sm">
                        {orders.length}
                      </span>
                    </header>

                    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                      {orders.length === 0 ? (
                        <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-black/15 bg-white/50 px-3 text-center text-xs text-muted-foreground">
                          Nenhuma OS nesta etapa.
                        </div>
                      ) : null}

                      {orders.map((order) => {
                        const statusOption = getServiceOrderStatusOption(
                          order.status,
                        );

                        return (
                          <article
                            key={order.id}
                            data-service-order-card
                            draggable={!statusMutation.isPending}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData(
                                "text/plain",
                                order.id,
                              );
                              setDraggingOrderId(order.id);
                            }}
                            onDragEnd={() => {
                              setDraggingOrderId(null);
                              setDragOverStatus(null);
                            }}
                            className={cn(
                              "rounded-md border border-border bg-card p-2 shadow-sm transition-all",
                              draggingOrderId === order.id
                                ? "scale-[0.98] cursor-grabbing opacity-60"
                                : "cursor-grab hover:-translate-y-0.5 hover:shadow-md",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                                #{order.code}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "max-w-24 shrink-0 truncate border-primary/20 bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] text-[0.625rem] text-foreground",
                                )}
                              >
                                {statusOption.label}
                              </Badge>
                            </div>

                            <h3
                              className="mt-1 truncate text-sm font-semibold leading-tight text-foreground"
                              title={getOrderSubtitle(order)}
                            >
                              {getOrderSubtitle(order)}
                            </h3>

                            <div className="mt-1 grid gap-1 text-[0.6875rem]">
                              <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Car className="size-3.5 shrink-0" />
                                <span className="truncate font-medium text-foreground">
                                  {getVehicleLabel(order)}
                                </span>
                              </p>
                              <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Wrench className="size-3.5 shrink-0" />
                                <span className="truncate font-medium text-foreground">
                                  {order.mechanic?.name ?? "Sem mecânico"}
                                </span>
                              </p>
                            </div>

                            <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7"
                              >
                                <Link
                                  href={`/ordens-servico/${order.id}/detalhes`}
                                >
                                  <FileText className="size-3" />
                                  Detalhes
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="h-7 w-8 bg-primary text-primary-foreground hover:bg-primary/80"
                                aria-label={`Abrir relatório da OS ${order.code}`}
                                onClick={() => setReportOrder(order)}
                              >
                                <FileText className="size-3.5" />
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-auto flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página{" "}
            <span className="font-medium text-foreground">
              {data.page ?? page}
            </span>{" "}
            de <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} ordens de serviço` : ""}
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
      {reportOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="relative w-full max-w-6xl rounded-lg border border-border bg-card p-7 shadow-2xl md:p-10">
            <button
              type="button"
              aria-label="Fechar"
              className="absolute right-5 top-5 text-3xl leading-none text-muted-foreground hover:text-foreground"
              onClick={() => setReportOrder(null)}
            >
              x
            </button>

            <div className="text-center text-primary text-5xl">
              <h1>EM CONSTRUÇÃO</h1>
            </div>

            <div className="mt-14 border-t pt-6 text-right">
              <Button
                type="button"
                variant="secondary"
                className="h-12 px-6 text-lg"
                onClick={() => setReportOrder(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
