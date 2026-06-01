"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import Header from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientsPage } from "../../hooks/use-clients-page";

export default function ClientsPage() {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    setPage,
    status,
    search,
    searchInput,
    setSearchInput,
    totalPages,
    handleSearch,
    handleStatusChange,
    handleClearSearch,
  } = useClientsPage();

  const showInitialLoading = isLoading;
  const showBackgroundLoading = isFetching && !isLoading;

  return (
    <section className="flex min-h-[calc(100vh-3rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Clientes"
          description="Gerencie os clientes cadastrados na oficina."
        />

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-4xl">
          <form
            onSubmit={handleSearch}
            className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-9 border-0 bg-transparent pl-9 pr-8 text-sm shadow-none focus-visible:ring-0"
              />

              {searchInput ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-sm sm:w-44">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as situações</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 font-medium"
              disabled={isFetching}
            >
              {showBackgroundLoading ? (
                <Spinner size="sm" className="text-primary-foreground" />
              ) : (
                "Buscar"
              )}
            </Button>
          </form>

          <Button asChild className="shrink-0 gap-2 font-medium">
            <Link href="/clientes/novo">
              <Plus className="size-3.5" />
              Cadastrar cliente
            </Link>
          </Button>
        </div>
      </div>

      {search ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Exibindo resultados para{" "}
            <strong className="font-medium text-foreground">{search}</strong>
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="h-7 px-2 text-xs"
          >
            Limpar filtro
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {showInitialLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando clientes...
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar clientes</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar clientes."}
            </AlertDescription>
          </Alert>
        )}

        {data && data.items.length === 0 && !isLoading && (
          <Empty className="min-h-55">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">
              Nenhum cliente encontrado
            </EmptyTitle>
            <EmptyDescription>
              Nenhum cliente encontrado para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        )}

        {data && data.items.length > 0 && (
          <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {showBackgroundLoading ? (
              <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary/70" />
            ) : null}

            <div className="w-full overflow-x-auto">
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
                      <Link href={`https://wa.me/${client.mobile ?? client.phoneResidential}`} target="_blank">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {client.mobile ?? client.phoneResidential ?? "-"}
                      </TableCell>
                      </Link>
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
          </div>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página{" "}
            <span className="font-medium text-foreground">{data.page ?? page}</span>{" "}
            de <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} clientes` : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page <= 1}
              className="h-8 gap-1 px-3 text-xs"
            >
              <ChevronLeft className="size-3" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((currentPage) => Math.min(totalPages, currentPage + 1))
              }
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
