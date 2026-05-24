"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchVehicles } from "./vehicle-api";
import type { VehicleSearchBy } from "./types";
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

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [searchBy, setSearchBy] = useState<VehicleSearchBy>("PLACA");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vehicles", { page, searchBy, search }],
    queryFn: () =>
      fetchVehicles({ page, pageSize: PAGE_SIZE, searchBy, search }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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

  function handleSearchBy(value: string) {
    setSearchBy(value as VehicleSearchBy);
    setPage(1);
  }

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header title="Veículos" description="Gerencie os veículos cadastrados na oficina." />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/veiculos/novo">
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
            Cadastrar veículo
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center"
      >
        <div className="w-full sm:w-44">
          <Select value={searchBy} onValueChange={handleSearchBy}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Buscar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLACA">Placa</SelectItem>
              <SelectItem value="MARCA">Marca</SelectItem>
              <SelectItem value="MODELO">Modelo</SelectItem>
              <SelectItem value="CLIENTE">Cliente</SelectItem>
              <SelectItem value="CODIGO">Código</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Input
            placeholder="Buscar veículo..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando veículos...
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar veículos."}
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
              <path d="M19 17h2l-1.5-4.5A3 3 0 0 0 16.65 10h-9.3a3 3 0 0 0-2.85 2.5L3 17h2" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
              <path d="M9 10V7h6v3" />
            </svg>
            Nenhum veículo encontrado para os filtros aplicados.
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="w-full overflow-x-auto border-y border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Placa
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Marca
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Modelo
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Código
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
                {data.items.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    className="group transition-colors hover:bg-accent/40"
                  >
                    <TableCell className="font-medium text-foreground">
                      {vehicle.plate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.brand ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.model ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.client?.name ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {vehicle.code}
                    </TableCell>
                    <TableCell>
                      {vehicle.status === "ATIVO" ? (
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-3 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Link href={`/veiculos/${vehicle.id}`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
            {data.total ? ` - ${data.total} veículos` : ""}
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
    </section>
  );
}
