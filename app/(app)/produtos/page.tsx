"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteCatalogItem, fetchCatalogItems } from "../pdv/pdv-api";
import type { CatalogItemType } from "../pdv/types";
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

const PAGE_SIZE = 10;

type TypeFilter = CatalogItemType | "TODOS";

function formatCurrency(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog-items", { page, type, search }],
    queryFn: () =>
      fetchCatalogItems({
        page,
        pageSize: PAGE_SIZE,
        type,
        search,
        includeInactive: true,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCatalogItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
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
          <h1 className="text-2xl font-semibold">Produtos e serviços</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre itens para usar nas vendas do PDV.
          </p>
        </div>
        <Button asChild>
          <Link href="/produtos/novo">Cadastrar item</Link>
        </Button>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
        <Input
          className="flex-1"
          placeholder="Buscar por codigo, nome ou SKU"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as TypeFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="PRODUTO">Produtos</SelectItem>
            <SelectItem value="SERVICO">Serviços</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando produtos...
        </div>
      ) : null}

      {isError ? (
        <div className="py-8 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar produtos."}
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>#{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.type === "PRODUTO" ? "Produto" : "Servico"}</TableCell>
                  <TableCell>{item.sku ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/produtos/${item.id}`}>Editar</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
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
          Nenhum item encontrado.
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
