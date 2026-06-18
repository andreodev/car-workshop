"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  formatCep,
  formatCpfCnpj,
  formatPhone,
} from "../../utils/client-form-utils";
import { onlyDigits } from "../../utils/client-input-masks";

export default function ClientsPage() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    setPage,
    statusInput,
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Header
          title="Clientes"
          description="Gerencie os clientes cadastrados na oficina."
        />

        <Button asChild className="h-9 shrink-0 gap-2 font-medium">
          <Link href="/clientes/novo">
            <Plus className="size-3.5" />
            Cadastrar cliente
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <h2 className="font-heading text-base font-700 text-foreground">
          Filtros
        </h2>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Buscar
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF/CNPJ ou telefone"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-10 rounded-lg bg-input/20 pl-9 pr-9 text-sm"
              />

              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Situacao
            </span>
            <Select value={statusInput} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-input/20 px-3 text-sm">
                <SelectValue placeholder="Todas as situacoes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as situacoes</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            Limpar filtros
          </Button>

          <Button
            type="submit"
            size="sm"
            className="h-9 px-4 font-medium sm:min-w-32"
            disabled={isFetching}
          >
            {showBackgroundLoading ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              "Aplicar filtros"
            )}
          </Button>
        </div>
      </form>

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
                      CPF/CNPJ
                    </TableHead>
                    <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                      CEP
                    </TableHead>
                    <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                      Telefone
                    </TableHead>
                    <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                      Situacao
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.items.map((client) => {
                    const clientHref = `/clientes/${client.id}`;

                    return (
                      <TableRow
                        key={client.id}
                        role="link"
                        tabIndex={0}
                        aria-label={`Abrir detalhes do cliente ${client.name}`}
                        onClick={() => router.push(clientHref)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(clientHref);
                          }
                        }}
                        className="cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <TableCell className="font-medium text-foreground">
                          {client.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {client.cpf ? formatCpfCnpj(client.cpf) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.cep ? formatCep(client.cep) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {client.mobile ?? client.phoneResidential ? (
                            <a
                              href={`https://wa.me/${onlyDigits(
                                client.mobile ?? client.phoneResidential ?? ""
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {formatPhone(client.mobile ?? client.phoneResidential ?? "")}
                            </a>
                          ) : (
                            "-"
                          )}
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Pagina{" "}
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
              Proxima
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
