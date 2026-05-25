"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { fetchClients } from "./client-api";
import type { ClientStatus } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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

type StatusFilter = ClientStatus | "TODOS";

export default function ClientsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clients", { page, status, search }],
    queryFn: () => fetchClients({ page, pageSize: PAGE_SIZE, status, search }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
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
        <Header title="Clientes" description="Gerencie os clientes cadastrados na oficina." />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/clientes/novo">
            <Plus className="size-3.5" />
            Cadastrar cliente
          </Link>
        </Button>
      </div>

      {/* Barra de filtros */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas as situações</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="INATIVO">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      {/* Área de conteúdo */}
      <div className="flex min-h-[560px] flex-col gap-4">

        {/* Estado: carregando */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando clientes...
          </div>
        )}

        {/* Estado: erro */}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar clientes."}
          </div>
        )}

        {/* Estado: lista vazia */}
        {data && data.items.length === 0 && !isLoading && (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhum cliente encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum cliente encontrado para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        )}

        {/* Estado: tabela com dados */}
        {data && data.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    CPF
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Bairro
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Telefone
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Situação
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.items.map((client) => (
                  <TableRow
                    key={client.id}
                    className="group transition-colors hover:bg-accent/40"
                  >
                    <TableCell className="font-medium text-foreground">
                      {client.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {client.cpf ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.neighborhood ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {client.mobile ?? client.phoneResidential ?? "-"}
                    </TableCell>
                    <TableCell>
                      {client.status === "ATIVO" ? (
                        <Badge
                          variant="default"
                          className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                        >
                          <span className="status-dot-active" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1.5 text-muted-foreground"
                        >
                          <span className="status-dot-inactive" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-3 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Link href={`/clientes/${client.id}`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {data && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página{" "}
            <span className="font-medium text-foreground">{data.page ?? page}</span>
            {" "}de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} clientes` : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 gap-1 px-3 text-xs"
            >
              <ChevronLeft className="size-3" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
