"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

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
import Header from "@/components/ui/header";

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
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente, veículo, responsável ou número..."
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

        <Button type="submit" variant="secondary" size="sm" className="h-9 gap-2 px-5 font-medium">
          <Search className="size-3.5" />
          Buscar
        </Button>
      </form>

      <div className="flex min-h-[560px] flex-col gap-4">
        {isLoading && (
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

        {data && data.items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <FileText className="size-8 opacity-40" strokeWidth={1.5} />
            Nenhum orçamento encontrado para os filtros aplicados.
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Número
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Veículo
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
                  const canConvert =
                    !estimate.convertedServiceOrderId &&
                    estimate.status === "APROVADO";
                  const isConverting =
                    convertMutation.isPending && convertMutation.variables === estimate.id;

                  return (
                    <TableRow
                      key={estimate.id}
                      className="group transition-colors hover:bg-accent/40"
                    >
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        #{estimate.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{estimate.type}</TableCell>
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
                      <TableCell>
                        <Badge variant={statusOption.variant} className={statusOption.className}>
                          {statusOption.label}
                        </Badge>
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
                            asChild
                            className="h-7 gap-1 px-2 text-xs font-medium"
                          >
                            <Link href={`/orcamentos/${estimate.id}/detalhes`}>
                              <FileText className="size-3" />
                              Detalhes
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Editar orçamento"
                            className="size-7"
                          >
                            <Link href={`/orcamentos/${estimate.id}`}>
                              <Pencil className="size-3.5" />
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
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              title={
                                estimate.status === "APROVADO"
                                  ? "Gerar OS"
                                  : "Aprove o orçamento para gerar a OS"
                              }
                              disabled={!canConvert || isConverting}
                              className="size-7 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => convertMutation.mutate(estimate.id)}
                            >
                              <Check className="size-3.5" strokeWidth={2.5} />
                            </Button>
                          )}
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
    </section>
  );
}
