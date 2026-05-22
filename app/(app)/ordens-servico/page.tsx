"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Fraunces, Sora } from "next/font/google";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Calendar03Icon,
  Clock01Icon,
  File02Icon,
  Flag03Icon,
  InformationCircleIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { fetchServiceOrders, updateServiceOrderStatus } from "./service-order-api";
import { serviceOrderStatusOptions } from "./status";
import type { ServiceOrder, ServiceOrderStatus } from "./types";
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

const titleFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Sora({ subsets: ["latin"], weight: ["400", "500", "600"] });

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
    <div
      className={`${bodyFont.className} relative overflow-hidden rounded-[32px] border bg-white/80 p-6 shadow-lg backdrop-blur`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(14,116,144,0.16),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-slate-100/70 via-transparent to-sky-100/70" />

      <div className="relative z-10 space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Operacao diaria
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              Ordens de servico
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe o fluxo de OS, prazos e responsaveis.
            </p>
          </div>
          <Button asChild>
            <Link href="/ordens-servico/novo">Cadastrar OS</Link>
          </Button>
        </header>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 rounded-2xl border bg-white/90 p-4 shadow-sm md:flex-row md:items-center"
        >
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente, veiculo, responsavel ou OS"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
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
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando ordens de servico...
          </div>
        ) : null}

        {isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar ordens de servico."}
          </div>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma ordem de servico encontrada.
          </div>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto rounded-sm border bg-white shadow-sm">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow className="h-12 border-b-2 bg-white text-[15px]">
                  <TableHead className="w-36">Opcoes</TableHead>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veiculo</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead className="w-28">Hora</TableHead>
                  <TableHead className="w-24 text-center">
                    <span className="sr-only">Concluir</span>
                  </TableHead>
                  <TableHead className="w-24 text-center">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2.5}
                      className="mx-auto size-4 text-neutral-700"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((order) => {
                  const isOpen = openMenuId === order.id;
                  const isFinished = order.status === "FINALIZADA";
                  const hasFlag =
                    order.status === "AGUARDANDO_PECAS" || order.status === "IMPEDIDA";
                  const isChangingThis =
                    statusMutation.isPending &&
                    statusMutation.variables?.id === order.id;

                  return (
                    <TableRow
                      key={order.id}
                      className="h-[76px] bg-neutral-50 text-base"
                    >
                      <TableCell className="relative align-middle">
                        <Button
                          type="button"
                          className="h-9 bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
                          onClick={() => setOpenMenuId(isOpen ? null : order.id)}
                        >
                          Opcoes
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            strokeWidth={2.4}
                            className="size-3.5"
                          />
                        </Button>
                        {isOpen ? (
                          <div className="absolute left-4 top-[-86px] z-20 w-56 overflow-hidden rounded-md border bg-white text-sm shadow-lg">
                            <Link
                              href={order.client?.id ? `/clientes/${order.client.id}` : "#"}
                              className="flex items-center gap-2 px-4 py-3 text-neutral-600 hover:bg-neutral-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                              Visualizar Cliente
                            </Link>
                            <Link
                              href={`/ordens-servico/${order.id}/detalhes`}
                              className="flex items-center gap-2 px-4 py-3 text-neutral-600 hover:bg-neutral-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                              Visualizar OS
                            </Link>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-middle text-center font-medium">
                        {order.code}
                      </TableCell>
                      <TableCell className="align-middle font-semibold text-neutral-700">
                        {order.vehicle?.plate ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-64 align-middle">
                        <Link
                          href={order.client?.id ? `/clientes/${order.client.id}` : "#"}
                          className="block truncate text-lg text-blue-400 hover:text-blue-600"
                          title={order.client?.name ?? undefined}
                        >
                          {order.client?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-52 align-middle font-medium text-neutral-700">
                        <span className="block truncate" title={order.vehicle?.model ?? undefined}>
                          {order.vehicle?.model ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="text-lg text-blue-400">{order.responsible}</span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="inline-flex h-9 items-center gap-1 rounded-md bg-red-500 px-3 text-sm font-semibold text-white shadow-sm">
                          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4" />
                          {formatDate(order.entryAt)}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="inline-flex h-9 items-center gap-1 rounded-md bg-red-500 px-3 text-sm font-semibold text-white shadow-sm">
                          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />
                          {formatTime(order.entryAt)}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle text-center">
                        <Button
                          type="button"
                          size="icon-lg"
                          title={isFinished ? "Servico concluido" : "Aprovar conclusao"}
                          disabled={isChangingThis || isFinished}
                          className={
                            isFinished
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          }
                          onClick={() =>
                            statusMutation.mutate({ id: order.id, status: "FINALIZADA" })
                          }
                        >
                          <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-5" />
                        </Button>
                      </TableCell>
                      <TableCell className="align-middle text-center">
                        <Button
                          type="button"
                          size="icon-lg"
                          title="Relatorio de situacoes"
                          className={
                            hasFlag
                              ? "bg-red-700 text-white hover:bg-red-800"
                              : "bg-red-600 text-white hover:bg-red-700"
                          }
                          onClick={() => setReportOrder(order)}
                        >
                          <HugeiconsIcon icon={Flag03Icon} strokeWidth={2.4} className="size-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="text-xs text-muted-foreground">
            Pagina {data?.page ?? page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>

      {reportOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="relative w-full max-w-6xl rounded-md bg-white p-7 shadow-2xl md:p-10">
            <button
              type="button"
              aria-label="Fechar"
              className="absolute right-5 top-5 text-3xl leading-none text-neutral-300 hover:text-neutral-500"
              onClick={() => setReportOrder(null)}
            >
              x
            </button>

            <h2 className="text-2xl font-normal text-neutral-700">
              Relatorio de situacoes
            </h2>

            <div className="mt-8 border-t pt-5">
              <Table className="min-w-[860px] text-base">
                <TableHeader>
                  <TableRow className="border-y text-base">
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Situacao
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Data de inicio
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Data de termino
                    </TableHead>
                    <TableHead className="h-14 px-4 text-base font-bold uppercase">
                      Tempo total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="h-16">
                    <TableCell className="px-4 text-lg font-medium text-neutral-700">
                      SUPERVISAO
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-blue-500 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4" />
                        {formatDateTime(reportOrder.entryAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-green-600 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4" />
                        {formatDateTime(reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-amber-400 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />
                        {formatElapsed(reportOrder.entryAt, reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="h-16">
                    <TableCell className="px-4 text-lg font-medium text-neutral-700">
                      {getSituationLabel(reportOrder.status)}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-blue-500 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4" />
                        {formatDateTime(reportOrder.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-green-600 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4" />
                        Situacao atual
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex h-9 items-center gap-2 rounded bg-amber-400 px-3 text-base italic text-white">
                        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />
                        Situacao atual
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="ml-auto mt-4 max-w-[560px] border-l-4 border-cyan-300 bg-sky-50 px-7 py-6 text-lg text-sky-800">
              Tempo gasto ate o momento:{" "}
              <span className="ml-8 font-bold">{formatElapsed(reportOrder.updatedAt)}</span>
            </div>

            <p className="mt-16 text-sm text-neutral-500">
              * O tempo total de cada situacao e calculado baseado nos horarios registrados
              nesta ordem de servico.
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
    </div>
  );
}
