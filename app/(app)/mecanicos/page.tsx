"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus, Search } from "lucide-react";

import { deleteMechanic, fetchMechanics } from "./mechanic-api";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

function formatPercent(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}%`;
}

export default function MechanicsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mechanics", { page, search }],
    queryFn: () =>
      fetchMechanics({
        page,
        pageSize: PAGE_SIZE,
        search,
        includeInactive: true,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMechanic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      queryClient.invalidateQueries({ queryKey: ["service-order-mechanics"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-mechanics"] });
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

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Mecânicos"
          description="Cadastre a equipe para selecionar responsáveis na oficina."
        />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/mecanicos/novo">
            <Plus className="size-3.5" />
            Cadastrar mecânico
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <Input
          className="h-9 flex-1 text-sm"
          placeholder="Buscar por código ou nome..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      {deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao excluir mecânico</AlertTitle>
          <AlertDescription>
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "Não foi possível excluir o mecânico."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[560px] flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando mecânicos...
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar mecânicos</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar mecânicos."}
            </AlertDescription>
          </Alert>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhum mecânico encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum mecânico encontrado para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Código
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Situação
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Comissão
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((mechanic) => (
                  <TableRow
                    key={mechanic.id}
                    className="group transition-colors hover:bg-accent/40"
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{mechanic.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{mechanic.name}</TableCell>
                    <TableCell>
                      {mechanic.active ? (
                        <Badge
                          variant="default"
                          className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                        >
                          <span className="status-dot-active" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
                          <span className="status-dot-inactive" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatPercent(mechanic.commissionPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 gap-1.5 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Link href={`/mecanicos/${mechanic.id}/relatorio`}>
                          <FileText className="size-3" />
                          Relatório
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Link href={`/mecanicos/${mechanic.id}`}>Editar</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => deleteMutation.mutate(mechanic.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>

      {data && totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{data.page ?? page}</span> de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} mecânicos` : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 gap-1 px-3 text-xs"
            >
              <ChevronLeft className="size-3" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="h-8 gap-1 px-3 text-xs"
            >
              Próxima
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
