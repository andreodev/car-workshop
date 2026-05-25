"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Car, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { fetchVehicles } from "./vehicle-api";
import type { VehicleSearchBy } from "./types";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
            <Plus className="size-3.5" />
            Cadastrar veículo
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
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
            <Spinner size="sm" className="text-primary" />
            Carregando veículos...
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar veículos</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar veículos."}
            </AlertDescription>
          </Alert>
        )}

        {data && data.items.length === 0 && !isLoading && (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Car className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhum veículo encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum veículo encontrado para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        )}

        {data && data.items.length > 0 && (
          <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
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
