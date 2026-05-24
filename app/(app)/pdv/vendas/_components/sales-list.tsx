"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CashierIcon,
  CancelCircleIcon,
  Invoice01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { fetchSales, updateSaleStatus } from "../../pdv-api";
import type { Sale, SaleStatus } from "../../types";
import { PdvSaleDialog } from "../../_components/pdv-sale-dialog";
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

type SalesListProps = {
  defaultResponsible: string;
};

const PAGE_SIZE = 10;

type StatusFilter = SaleStatus | "TODOS";

function formatCurrency(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO_CREDITO: "Cartao credito",
    CARTAO_DEBITO: "Cartao debito",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };
  return labels[value] ?? value;
}

export function SalesList({ defaultResponsible }: SalesListProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pdvOpen, setPdvOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sales", { page, search, status, from, to }],
    queryFn: () => fetchSales({ page, pageSize: PAGE_SIZE, search, status, from, to }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: (sale: Sale) => updateSaleStatus(sale.id, "CANCELADA"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const pageTotal = useMemo(() => {
    return (
      data?.items.reduce((sum, sale) => {
        if (sale.status === "CANCELADA") {
          return sum;
        }
        return sum + Number(sale.total);
      }, 0) ?? 0
    );
  }, [data]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-6 rounded-md border bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            PDV
          </p>
          <h1 className="text-2xl font-semibold">Listar vendas</h1>
          <p className="text-sm text-muted-foreground">
            Consulte o movimento de venda balcão e cancele registros quando necessário.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setPdvOpen(true)}>
            <HugeiconsIcon icon={CashierIcon} strokeWidth={2.5} />
            Nova venda
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pdv">
              <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2.5} />
              PDV
            </Link>
          </Button>
        </div>
      </header>

      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_160px_150px_150px_auto]"
      >
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Buscar por venda, cliente, item, setor ou funcionario"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="CONCLUIDA">Concluidas</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Button type="submit">Buscar</Button>
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Vendas encontradas</p>
          <p className="text-xl font-semibold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Total desta pagina</p>
          <p className="text-xl font-semibold text-emerald-700">
            {formatCurrency(pageTotal)}
          </p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Página</p>
          <p className="text-xl font-semibold">
            {page} de {totalPages}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando vendas...
        </div>
      ) : null}

      {isError ? (
        <div className="py-8 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar vendas."}
        </div>
      ) : null}

      {data && data.items.length === 0 && !isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma venda encontrada.
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Funcionario</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-44 text-right">Opcoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((sale) => (
                <Fragment key={sale.id}>
                  <TableRow>
                    <TableCell className="font-semibold">#{sale.code}</TableCell>
                    <TableCell>{sale.client?.name ?? "Caixa livre"}</TableCell>
                    <TableCell>{sale.sector?.name ?? sale.sectorName ?? "-"}</TableCell>
                    <TableCell>{sale.responsible}</TableCell>
                    <TableCell>{paymentLabel(sale.paymentMethod)}</TableCell>
                    <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={sale.status === "CONCLUIDA" ? "secondary" : "destructive"}>
                        {sale.status === "CONCLUIDA" ? "Concluida" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedId((current) => (current === sale.id ? null : sale.id))
                          }
                        >
                          Itens
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={sale.status === "CANCELADA" || cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(sale)}
                        >
                          <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2.5} />
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === sale.id ? (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qtde.</TableHead>
                                <TableHead className="text-right">Unit.</TableHead>
                                <TableHead className="text-right">Desc.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sale.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right">
                                    {Number(item.quantity)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.discount)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(item.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
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

      <PdvSaleDialog
        open={pdvOpen}
        defaultResponsible={defaultResponsible}
        onClose={() => setPdvOpen(false)}
      />
    </div>
  );
}
