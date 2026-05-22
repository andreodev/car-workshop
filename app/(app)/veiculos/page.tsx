"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { fetchVehicles } from "./vehicle-api";
import type { VehicleSearchBy } from "./types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    keepPreviousData: true,
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
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Veiculos</CardTitle>
          <CardDescription>Gerencie sua frota cadastrada.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/veiculos/novo">Cadastrar veiculo</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
          <div className="w-full md:w-40">
            <Select value={searchBy} onValueChange={handleSearchBy}>
              <SelectTrigger>
                <SelectValue placeholder="Buscar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLACA">Placa</SelectItem>
                <SelectItem value="MARCA">Marca</SelectItem>
                <SelectItem value="MODELO">Modelo</SelectItem>
                <SelectItem value="CLIENTE">Cliente</SelectItem>
                <SelectItem value="CODIGO">Codigo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              placeholder="Buscar veiculo"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando veiculos...
          </div>
        ) : null}

        {isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar veiculos."}
          </div>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum veiculo encontrado.
          </div>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Codigo</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.plate}</TableCell>
                    <TableCell>{vehicle.brand ?? "-"}</TableCell>
                    <TableCell>{vehicle.model ?? "-"}</TableCell>
                    <TableCell>{vehicle.client?.name ?? "-"}</TableCell>
                    <TableCell>{vehicle.code}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/veiculos/${vehicle.id}`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
      </CardContent>
    </Card>
  );
}
