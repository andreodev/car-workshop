"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fraunces, Sora } from "next/font/google";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  File02Icon,
  Invoice01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { convertEstimate, fetchEstimates } from "./estimate-api";
import { estimateStatusOptions, getEstimateStatusOption } from "./status";
import type { EstimateStatus } from "./types";
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

const titleFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Sora({ subsets: ["latin"], weight: ["400", "500", "600"] });

const PAGE_SIZE = 10;

type StatusFilter = EstimateStatus | "TODOS";

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR");
}

export default function EstimatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["estimates", { page, status, search }],
    queryFn: () => fetchEstimates({ page, pageSize: PAGE_SIZE, status, search }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convertEstimate(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.setQueryData(["estimate", result.estimate.id], result.estimate);
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
    <div className={`${bodyFont.className} border bg-white p-6 shadow-sm`}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Frente de atendimento
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              Orcamentos
            </h1>
            <p className="text-sm text-muted-foreground">
              Busque propostas, aprove valores e converta em ordem de servico.
            </p>
          </div>
          <Button asChild>
            <Link href="/orcamentos/novo">Incluir orcamento</Link>
          </Button>
        </header>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 border bg-white p-4 shadow-sm md:flex-row md:items-center"
        >
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente, veiculo, responsavel ou numero"
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
                {estimateStatusOptions.map((option) => (
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
            Carregando orcamentos...
          </div>
        ) : null}

        {isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar orcamentos."}
          </div>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum orcamento encontrado.
          </div>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto border bg-white shadow-sm">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="h-12 border-b-2 bg-white text-[15px]">
                  <TableHead className="w-36">Opcoes</TableHead>
                  <TableHead className="w-24">No</TableHead>
                  <TableHead className="w-28">Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veiculo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total servicos</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total da nota</TableHead>
                  <TableHead className="w-28">Validade</TableHead>
                  <TableHead className="w-20 text-center">OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((estimate) => {
                  const statusOption = getEstimateStatusOption(estimate.status);
                  const isOpen = openMenuId === estimate.id;
                  const canConvert =
                    !estimate.convertedServiceOrderId &&
                    estimate.status !== "REJEITADO" &&
                    estimate.status !== "CANCELADO";
                  const isConverting =
                    convertMutation.isPending && convertMutation.variables === estimate.id;
                  return (
                    <TableRow key={estimate.id} className="h-[68px] bg-neutral-50 text-sm">
                      <TableCell className="relative align-middle">
                        <Button
                          type="button"
                          className="h-9 bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
                          onClick={() => setOpenMenuId(isOpen ? null : estimate.id)}
                        >
                          Opcoes
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            strokeWidth={2.4}
                            className="size-3.5"
                          />
                        </Button>
                        {isOpen ? (
                          <div className="absolute left-4 top-12 z-20 w-56 overflow-hidden rounded-md border bg-white text-sm shadow-lg">
                            <Link
                              href={`/orcamentos/${estimate.id}/detalhes`}
                              className="flex items-center gap-2 px-4 py-3 text-neutral-600 hover:bg-neutral-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                              Visualizar orcamento
                            </Link>
                            <Link
                              href={`/orcamentos/${estimate.id}`}
                              className="flex items-center gap-2 px-4 py-3 text-neutral-600 hover:bg-neutral-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <HugeiconsIcon
                                icon={Invoice01Icon}
                                strokeWidth={2}
                                className="size-4"
                              />
                              Editar orcamento
                            </Link>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-middle font-medium">
                        {estimate.code}
                      </TableCell>
                      <TableCell className="align-middle">{estimate.type}</TableCell>
                      <TableCell className="max-w-64 align-middle">
                        <Link
                          href={estimate.client?.id ? `/clientes/${estimate.client.id}` : "#"}
                          className="block truncate text-blue-500 hover:text-blue-700"
                          title={estimate.client?.name ?? undefined}
                        >
                          {estimate.client?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-52 align-middle">
                        <span
                          className="block truncate"
                          title={estimate.vehicle?.model ?? undefined}
                        >
                          {estimate.vehicle?.plate ?? "-"}
                          {estimate.vehicle?.model ? ` - ${estimate.vehicle.model}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant={statusOption.variant} className={statusOption.className}>
                          {statusOption.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        {formatCurrency(estimate.subtotal)}
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        {formatCurrency(estimate.discountTotal)}
                      </TableCell>
                      <TableCell className="align-middle text-right font-semibold">
                        {formatCurrency(estimate.total)}
                      </TableCell>
                      <TableCell className="align-middle">
                        {formatDate(estimate.validUntil)}
                      </TableCell>
                      <TableCell className="align-middle text-center">
                        {estimate.convertedServiceOrder ? (
                          <Button asChild variant="secondary" size="sm">
                            <Link
                              href={`/ordens-servico/${estimate.convertedServiceOrder.id}/detalhes`}
                            >
                              OS {estimate.convertedServiceOrder.code}
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="icon-lg"
                            title="Aprovar e gerar OS"
                            disabled={!canConvert || isConverting}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => convertMutation.mutate(estimate.id)}
                          >
                            <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {convertMutation.error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {convertMutation.error instanceof Error
              ? convertMutation.error.message
              : "Nao foi possivel gerar a OS."}
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
    </div>
  );
}
