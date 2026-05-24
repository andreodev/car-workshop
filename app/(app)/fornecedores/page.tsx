"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSupplier, fetchSuppliers } from "./supplier-api";
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

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["suppliers", { page, search }],
    queryFn: () => fetchSuppliers({ page, pageSize: PAGE_SIZE, search }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-options"] });
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
          <h1 className="text-2xl font-semibold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre fornecedores e acompanhe os pedidos de compra.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/fornecedores/pedidos">Pedidos</Link>
          </Button>
          <Button asChild>
            <Link href="/fornecedores/novo">Cadastrar fornecedor</Link>
          </Button>
        </div>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
        <Input
          className="flex-1"
          placeholder="Buscar por codigo, nome, CPF, email ou linha de produtos"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {deleteMutation.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "Não foi possível excluir o fornecedor."}
        </div>
      ) : null}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando fornecedores...
        </div>
      ) : null}

      {isError ? (
        <div className="py-8 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar fornecedores."}
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Linha de produtos</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>#{supplier.code}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <div>{supplier.contact || supplier.email || "-"}</div>
                    <div className="text-xs text-muted-foreground">{supplier.phone1 || ""}</div>
                  </TableCell>
                  <TableCell>{supplier.productLine || "-"}</TableCell>
                  <TableCell>
                    {[supplier.city, supplier.state].filter(Boolean).join(" / ") || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/fornecedores/${supplier.id}`}>Editar</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(supplier.id)}
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
          Nenhum fornecedor encontrado.
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
