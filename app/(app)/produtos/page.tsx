"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { deleteCatalogItem, fetchCatalogItems } from "@/modules/pdv/api/pdv.service";
import type { CatalogItemType } from "@/modules/pdv/types/pdv.types";
import { formatStock } from "@/modules/pdv/utils/pdv-sale-utils";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
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

  function handleTypeChange(value: string) {
    setType(value as TypeFilter);
    setPage(1);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Produtos e Serviços"
          description="Cadastre itens para usar nas vendas do PDV."
        />

        <Button asChild className="shrink-0 gap-2 font-medium">
          <Link href="/produtos/novo">
            <Plus className="size-3.5" />
            Cadastrar item
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <Input
          className="h-9 flex-1 text-sm"
          placeholder="Buscar por código, nome ou SKU..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="PRODUTO">Produtos</SelectItem>
            <SelectItem value="SERVICO">Serviços</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      {deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao excluir item</AlertTitle>
          <AlertDescription>
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "Não foi possível excluir o item."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[560px] flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando produtos...
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar produtos</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar produtos."}
            </AlertDescription>
          </Alert>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhum item encontrado</EmptyTitle>
            <EmptyDescription>Nenhum item encontrado para os filtros aplicados.</EmptyDescription>
          </Empty>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Código
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    SKU
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Estoque
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Valor
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
                {data.items.map((item) => (
                  <TableRow key={item.id} className="group transition-colors hover:bg-accent/40">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{item.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.type === "PRODUTO" ? "Produto" : "Serviço"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.sku ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {item.type === "PRODUTO" ? formatStock(item.stockCurrent) ?? "0" : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell>
                      {item.active ? (
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
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Link href={`/produtos/${item.id}`}>Editar</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
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
      </div>

      {data && totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{data.page ?? page}</span> de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} itens` : ""}
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
