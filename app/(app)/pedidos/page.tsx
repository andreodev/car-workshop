"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";

import { deleteSupplierOrder, fetchSupplierOrders } from "../fornecedores/supplier-api";
import type { SupplierOrderStatus } from "../fornecedores/types";
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

const statusLabels: Record<SupplierOrderStatus, string> = {
  ABERTO: "Aberto",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function getStatusBadgeClass(status: SupplierOrderStatus) {
  if (status === "CANCELADO") {
    return "gap-1.5 text-muted-foreground";
  }

  if (status === "RECEBIDO") {
    return "gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20";
  }

  return "gap-1.5 border-0 bg-amber-100 text-amber-700 hover:bg-amber-100";
}

export default function SupplierOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supplier-orders", { page, search, status }],
    queryFn: () =>
      fetchSupplierOrders({
        page,
        pageSize: PAGE_SIZE,
        search,
        status,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplierOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
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

  function handleStatusChange(value: string) {
    setPage(1);
    setStatus(value);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Pedidos"
          description="Controle previsões, notas fiscais e observações de compras."
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild className="shrink-0 gap-2 font-medium">
            <Link href="/fornecedores">
              <Users className="size-3.5" />
              Fornecedores
            </Link>
          </Button>
          <Button asChild className="shrink-0 gap-2 font-medium">
            <Link href="/pedidos/novo">
              <Plus className="size-3.5" />
              Cadastrar pedido
            </Link>
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <Input
          className="h-9 flex-1 text-sm"
          placeholder="Buscar por código, fornecedor, funcionário ou NF..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="ABERTO">Aberto</SelectItem>
            <SelectItem value="RECEBIDO">Recebido</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" variant="secondary" size="sm" className="h-9 px-5 font-medium">
          Buscar
        </Button>
      </form>

      {deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao excluir pedido</AlertTitle>
          <AlertDescription>
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "Não foi possível excluir o pedido."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[560px] flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando pedidos...
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar pedidos</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar pedidos."}
            </AlertDescription>
          </Alert>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhum pedido encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum pedido encontrado para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Código
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Fornecedor
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Funcionário
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Previsão
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Número NF
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Total
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
                {data.items.map((order) => (
                  <TableRow key={order.id} className="group transition-colors hover:bg-accent/40">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{order.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {order.supplier?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.employee}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {formatDate(order.forecastAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {order.invoiceNumber || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status === "CANCELADO" ? "secondary" : "default"}
                        className={getStatusBadgeClass(order.status)}
                      >
                        {order.status === "RECEBIDO" ? <span className="status-dot-active" /> : null}
                        {order.status === "CANCELADO" ? (
                          <span className="status-dot-inactive" />
                        ) : null}
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Link href={`/pedidos/${order.id}`}>Editar</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => deleteMutation.mutate(order.id)}
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
            {data.total ? ` - ${data.total} pedidos` : ""}
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
