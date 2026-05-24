"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { fetchServiceOrders, updateServiceOrderStatus } from "./service-order-api";
import {
  getServiceOrderStatusOption,
  serviceOrderStatusOptions,
} from "./status";
import type { ServiceOrder, ServiceOrderStatus } from "./types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Header from "@/components/ui/header";

const PAGE_SIZE = 10;

type StatusFilter = ServiceOrderStatus | "TODOS";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

function formatElapsed(start: string, end?: string) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function getSituationLabel(status: ServiceOrderStatus) {
  if (status === "AGUARDANDO_PECAS") {
    return "SERVICO PARADO";
  }

  if (status === "IMPEDIDA") {
    return "IMPEDIMENTO";
  }

  if (status === "FINALIZADA") {
    return "FINALIZADO";
  }

  return "SUPERVISAO";
}

export default function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reportOrder, setReportOrder] = useState<ServiceOrder | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["service-orders", { page, status, search }],
    queryFn: () => fetchServiceOrders({ page, pageSize: PAGE_SIZE, status, search }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceOrderStatus }) =>
      updateServiceOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatus(value as StatusFilter);
    setPage(1);
  }

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Ordens de serviço"
          description="Acompanhe o fluxo de OS, prazos e responsaveis."
        />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/ordens-servico/novo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5v14" />
            </svg>
            Cadastrar OS
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente, veículo, responsável ou OS..."
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
          <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    OS
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Placa
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Veículo
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Responsável
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Entrada
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.items.map((order) => {
                  const statusOption = getServiceOrderStatusOption(order.status);
                  const isFinished = order.status === "FINALIZADA";
                  const isChangingThis =
                    statusMutation.isPending &&
                    statusMutation.variables?.id === order.id;

                  return (
                    <TableRow
                      key={order.id}
                      className="group transition-colors hover:bg-accent/40"
                    >
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        #{order.code}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {order.vehicle?.plate ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-64 text-muted-foreground">
                        <Link
                          href={order.client?.id ? `/clientes/${order.client.id}` : "#"}
                          className="block truncate hover:text-foreground"
                          title={order.client?.name ?? undefined}
                        >
                          {order.client?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-52 text-muted-foreground">
                        <span className="block truncate" title={order.vehicle?.model ?? undefined}>
                          {order.vehicle?.model ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.responsible}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDate(order.entryAt)} {formatTime(order.entryAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusOption.variant}
                          className={statusOption.className}
                        >
                          {statusOption.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 px-3 text-xs font-medium"
                          >
                            <Link href={`/ordens-servico/${order.id}/detalhes`}>
                              Detalhes
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => setReportOrder(order)}
                          >
                            Relatorio
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isChangingThis || isFinished}
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() =>
                              statusMutation.mutate({ id: order.id, status: "FINALIZADA" })
                            }
                          >
                            {isFinished ? "Concluida" : "Concluir"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

            <h2 className="font-heading text-2xl font-700 text-foreground">
              Relatório de situações
            </h2>

            <div className="mt-8 border-t pt-5">
              <Table className="min-w-[860px] text-base">
                <TableHeader>
                  <TableRow className="border-y text-base">
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Situação
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Data de início
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Data de término
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Tempo total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="h-16">
                    <TableCell className="px-4 text-lg font-medium text-foreground">
                      SUPERVISAO
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/15 px-3 text-sm font-medium text-primary">
                        {formatDateTime(reportOrder.entryAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-100 px-3 text-sm font-medium text-emerald-700">
                        {formatDateTime(reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-100 px-3 text-sm font-medium text-amber-700">
                        {formatElapsed(reportOrder.entryAt, reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="h-16">
                    <TableCell className="px-4 text-lg font-medium text-foreground">
                      {getSituationLabel(reportOrder.status)}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/15 px-3 text-sm font-medium text-primary">
                        {formatDateTime(reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-100 px-3 text-sm font-medium text-emerald-700">
                        Situação atual
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-100 px-3 text-sm font-medium text-amber-700">
                        Situação atual
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="ml-auto mt-4 max-w-[560px] rounded-lg border border-primary/20 bg-primary/5 px-7 py-6 text-sm text-primary">
              Tempo gasto até o momento:{" "}
              <span className="ml-8 font-bold">{formatElapsed(reportOrder.updatedAt)}</span>
            </div>

            <p className="mt-16 text-sm text-muted-foreground">
              * O tempo total de cada situação e calculado baseado nos horários registrados
              nesta ordem de serviço.
            </p>

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
