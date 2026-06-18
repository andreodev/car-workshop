"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

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
import { fetchServiceOrders, updateServiceOrderStatus } from "@/app/(app)/ordens-servico/service-order-api";
import { getServiceOrderStatusOption, serviceOrderStatusOptions } from "@/app/(app)/ordens-servico/status";
import type { ServiceOrder, ServiceOrderStatus, StatusFilter } from "../../types/order-service.types";
import { formatDateTime } from "@/lib/time";
import { archivedBoardColumns, boardColumns } from "../../utils/order-service.constants";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@radix-ui/react-dialog";

const PAGE_SIZE = 50;

function needsEntryInspection(order: ServiceOrder) {
  return !order.vehicleInspection || order.vehicleInspection.status !== "CONCLUIDA";
}

export default function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reportOrder, setReportOrder] = useState<ServiceOrder | null>(null);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ServiceOrderStatus | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const showArchivedColumns =
    includeArchived || status === "FINALIZADA" || status === "CANCELADA";
  const visibleColumns = useMemo(
    () => (showArchivedColumns ? [...boardColumns, ...archivedBoardColumns] : boardColumns),
    [showArchivedColumns]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["service-orders", { page, status, search, includeArchived }],
    queryFn: () =>
      fetchServiceOrders({
        page,
        pageSize: PAGE_SIZE,
        status,
        search,
        includeArchived,
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
      visibleColumns.map((column) => [column.status, []])
    );

    (data?.items ?? []).forEach((order) => {
      grouped.get(order.status)?.push(order);
    });

    return grouped;
  }, [data, visibleColumns]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatus(value as StatusFilter);
    setPage(1);
  }

  function handleArchivedChange(value: string) {
    setIncludeArchived(value === "COM_HISTORICO");
    setPage(1);
  }

  function moveOrderToStatus(orderId: string, nextStatus: ServiceOrderStatus) {
    const order = data?.items.find((item) => item.id === orderId);

    if (!order || order.status === nextStatus || statusMutation.isPending) {
      return;
    }

    statusMutation.mutate({ id: orderId, status: nextStatus });
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, nextStatus: ServiceOrderStatus) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData("text/plain") || draggingOrderId;

    setDragOverStatus(null);

    if (!orderId) {
      return;
    }

    moveOrderToStatus(orderId, nextStatus);
  }

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Ordens de serviço"
          description="Acompanhe o fluxo de trabalho dos mecânicos por etapa."
        />
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente, veículo, mecânico, responsável ou OS..."
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
              {serviceOrderStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={includeArchived ? "COM_HISTORICO" : "OPERACIONAL"}
            onValueChange={handleArchivedChange}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Visão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERACIONAL">Só operação ativa</SelectItem>
              <SelectItem value="COM_HISTORICO">Incluir histórico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando ordens de serviço...
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar ordens de serviço."}
          </div>
        )}

        {data && data.items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-40"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M9 15h6M9 11h2" />
            </svg>
            Nenhuma ordem de serviço encontrada para os filtros aplicados.
          </div>
        )}


        {data && data.items.length > 0 && (
          <div className="overflow-x-auto pb-2">
            <div
              className={
                includeArchived
                  ? "grid min-w-345 grid-cols-6 gap-3"
                  : "grid min-w-240 grid-cols-4 gap-3"
              }
            >
              {visibleColumns.map((column) => {
                const orders = ordersByStatus.get(column.status) ?? [];

                return (
                  <section
                    key={column.status}
                    onDragOver={(event) => {
                      if (!draggingOrderId) {
                        return;
                      }

                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStatus(column.status);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        return;
                      }

                      setDragOverStatus(null);
                    }}
                    onDrop={(event) => handleDrop(event, column.status)}
                    className={`flex min-h-[520px] flex-col rounded-lg border p-3 transition-all ${column.className} ${
                      dragOverStatus === column.status
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }`}
                  >
                    <header className="space-y-1 border-b border-black/10 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-foreground">
                          {column.title}
                        </h2>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-2 text-xs font-semibold text-foreground shadow-sm">
                          {orders.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{column.description}</p>
                    </header>

                    <div className="mt-3 flex flex-1 flex-col gap-3">
                      {orders.length === 0 ? (
                        <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-black/15 bg-white/50 px-3 text-center text-xs text-muted-foreground">
                          Nenhuma OS nesta etapa.
                        </div>
                      ) : null}

                      {orders.map((order) => {
                        const statusOption = getServiceOrderStatusOption(order.status);
                        const isChangingThis =
                          statusMutation.isPending &&
                          statusMutation.variables?.id === order.id;
                        const isMissingEntryInspection = needsEntryInspection(order);

                        return (
                          <article
                            key={order.id}
                            draggable={!statusMutation.isPending}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", order.id);
                              setDraggingOrderId(order.id);
                            }}
                            onDragEnd={() => {
                              setDraggingOrderId(null);
                              setDragOverStatus(null);
                            }}
                            className={`rounded-md border border-border bg-white p-3 shadow-sm transition-all ${
                              draggingOrderId === order.id
                                ? "scale-[0.98] cursor-grabbing opacity-60"
                                : "cursor-grab hover:-translate-y-0.5 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold text-muted-foreground">
                                  OS #{order.code}
                                </p>
                                <h3
                                  className="mt-1 truncate text-sm font-semibold text-foreground"
                                  title={order.client?.name ?? undefined}
                                >
                                  {order.client?.name ?? "-"}
                                </h3>
                              </div>
                              <Badge
                                variant={statusOption.variant}
                                className={`shrink-0 text-[10px] ${statusOption.className ?? ""}`}
                              >
                                {statusOption.label}
                              </Badge>
                            </div>

                            <dl className="mt-3 space-y-2 text-xs">
                              <div>
                                <dt className="text-muted-foreground">Veículo</dt>
                                <dd className="font-medium text-foreground">
                                  {order.vehicle?.plate ?? "-"}
                                  {order.vehicle?.model ? ` - ${order.vehicle.model}` : ""}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Mecânico</dt>
                                <dd className="font-medium text-foreground">
                                  {order.mechanic?.name ?? "-"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Entrada</dt>
                                <dd className="font-mono text-foreground">
                                  {formatDateTime(order.entryAt)} {formatDateTime(order.entryAt)}
                                </dd>
                              </div>
                            </dl>

                            {isMissingEntryInspection ? (
                              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-900">
                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                <span>Verificação de entrada pendente.</span>
                              </div>
                            ) : null}

                            <div className="mt-3">
                              <Select
                                value={order.status}
                                disabled={isChangingThis}
                                onValueChange={(value) => {
                                  if (value === order.status) {
                                    return;
                                  }

                                  statusMutation.mutate({
                                    id: order.id,
                                    status: value as ServiceOrderStatus,
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 w-full bg-white text-xs">
                                  <SelectValue placeholder="Mover para" />
                                </SelectTrigger>
                                <SelectContent>
                                  {serviceOrderStatusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 px-2 text-xs"
                              >
                                <Link href={`/ordens-servico/${order.id}/detalhes`}>
                                  Detalhes
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setReportOrder(order)}
                              >
                                Relatório
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
            Página <span className="font-medium text-foreground">{data.page ?? page}</span>{" "}
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
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
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
