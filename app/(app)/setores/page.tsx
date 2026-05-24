"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSector, fetchSectors } from "../pdv/pdv-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function SectorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sectors", { page, search }],
    queryFn: () =>
      fetchSectors({
        page,
        pageSize: PAGE_SIZE,
        search,
        includeInactive: true,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-sectors"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
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
    <div className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Setores</h1>
          <p className="text-sm text-muted-foreground">
            Organize vendas por balcão, oficina, peças ou outro setor.
          </p>
        </div>
        <Button asChild>
          <Link href="/setores/novo">Cadastrar setor</Link>
        </Button>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
        <Input
          className="flex-1"
          placeholder="Buscar por codigo ou nome"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando setores...
        </div>
      ) : null}

      {isError ? (
        <div className="py-8 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar setores."}
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell>#{sector.code}</TableCell>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell>
                    <Badge variant={sector.active ? "default" : "secondary"}>
                      {sector.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/setores/${sector.id}`}>Editar</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(sector.id)}
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

      {data && data.items.length === 0 && !isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum setor encontrado.
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
