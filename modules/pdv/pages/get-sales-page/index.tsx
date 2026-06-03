"use client";

import { Fragment } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleX,
  CreditCard,
  Plus,
  Search,
} from "lucide-react";

import { PdvSaleDialog } from "../../components/pdv-sale-dialog";
import {
  useSalesPage,
  type SalesStatusFilter,
} from "../../hooks/use-sales-page";
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

type SalesListProps = {
  defaultResponsible: string;
};

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
    CARTAO_CREDITO: "Cartão crédito",
    CARTAO_DEBITO: "Cartão débito",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };

  return labels[value] ?? value;
}

export default function PdvSalesPage({ defaultResponsible }: SalesListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    cancelMutation,
    canceledCount,
    expandedId,
    expandedServiceOrderId,
    from,
    handleClosePdv,
    handleOpenNormalPdv,
    handlePayServiceOrder,
    handleSearch,
    page,
    pageTotal,
    pdvOpen,
    searchInput,
    selectedServiceOrder,
    serviceOrdersCompleted,
    serviceOrdersPendingPaymentTotal,
    setExpandedId,
    setExpandedServiceOrderId,
    setFrom,
    setPage,
    setSearchInput,
    setStatus,
    setTo,
    status,
    to,
    totalPages,
  } = useSalesPage();
  return (
    <section className="flex flex-col gap-6">
      {cancelMutation.isPending ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
            <Spinner className="size-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Cancelando venda
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="PDV"
          description="Consulte vendas de balcão, abra uma nova venda e acompanhe o movimento."
        />

        <Button
          type="button"
          onClick={handleOpenNormalPdv}
          className="h-10 shrink-0 gap-2 font-medium sm:h-7"
        >
          <Plus className="size-3.5" />
          Nova venda
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_150px_150px_auto]"
      >
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9 text-sm sm:h-9"
            placeholder="Buscar por venda, cliente, item, setor ou funcionário..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as SalesStatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-full text-sm sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
          className="h-10 text-sm sm:h-9"
        />

        <Input
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
          className="h-10 text-sm sm:h-9"
        />

        <Button type="submit" variant="secondary" size="sm" className="h-10 px-5 font-medium sm:h-9">
          Buscar
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Vendas encontradas</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{data?.total ?? 0}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Total da página</p>
          <p className="mt-1 text-xl font-semibold text-primary sm:text-2xl">{formatCurrency(pageTotal)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Canceladas na página</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{canceledCount}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">OS aguardando caixa</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {serviceOrdersCompleted.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(serviceOrdersPendingPaymentTotal)}
          </p>
        </div>
      </div>

      {serviceOrdersCompleted.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Ordens de serviço finalizadas aguardando pagamento
              </h2>
              <p className="text-xs text-muted-foreground">
                Serviços concluídos que precisam passar no caixa para informar a forma de pagamento.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {serviceOrdersCompleted.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-background p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      OS #{order.code}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                      {order.client?.name ?? "-"}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {order.vehicle
                        ? `${order.vehicle.plate} - ${order.vehicle.model}`
                        : "Veículo não informado"}
                    </p>
                  </div>

                  {order.financialAccount?.status === "PAGA" ? (
                    <Badge
                      variant="default"
                      className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                    >
                      <span className="status-dot-active" />
                      Pago
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20"
                    >
                      <span className="status-dot-inactive" />
                      Aguardando
                    </Badge>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Mecânico</p>
                    <p className="truncate font-medium">
                      {order.mechanic?.name ?? "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-primary">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Atualizada em</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatDateTime(order.updatedAt)}
                    </p>
                  </div>
                </div>

                {expandedServiceOrderId === order.id ? (
                  <div className="mt-3 rounded-md border border-border bg-muted/20">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border p-3 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Number(item.quantity)} x {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5"
                    onClick={() =>
                      setExpandedServiceOrderId((current) =>
                        current === order.id ? null : order.id,
                      )
                    }
                  >
                    <ChevronsUpDown className="size-3" />
                    {expandedServiceOrderId === order.id ? "Ocultar itens" : "Ver itens"}
                  </Button>

                  <Button
                    type="button"
                    className="h-10 gap-1.5"
                    onClick={() => handlePayServiceOrder(order)}
                  >
                    <CreditCard className="size-3" />
                    Efetuar pagamento
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Mecânico</TableHead>
                <TableHead>Atualizada em</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {serviceOrdersCompleted.map((order) => (
                <Fragment key={order.id}>
                  <TableRow className="group transition-colors hover:bg-accent/40">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{order.code}
                    </TableCell>

                    <TableCell className="font-medium text-foreground">
                      {order.client?.name ?? "-"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {order.vehicle
                        ? `${order.vehicle.plate} - ${order.vehicle.model}`
                        : "-"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {order.mechanic?.name ?? "-"}
                    </TableCell>

                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {formatDateTime(order.updatedAt)}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>

                    <TableCell className="text-center">
                      {order.financialAccount?.status === "PAGA" ? (
                        <Badge
                          variant="default"
                          className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                        >
                          <span className="status-dot-active" />
                          Pago
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1.5 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20"
                        >
                          <span className="status-dot-inactive" />
                          Aguardando
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1.5 px-3 text-xs font-medium"
                          onClick={() =>
                            setExpandedServiceOrderId((current) =>
                              current === order.id ? null : order.id,
                            )
                          }
                        >
                          <ChevronsUpDown className="size-3" />
                          Itens
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1.5 px-3 text-xs font-medium"
                          onClick={() => handlePayServiceOrder(order)}
                        >
                          <CreditCard className="size-3" />
                          Efetuar pagamento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedServiceOrderId === order.id ? (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qtde.</TableHead>
                                <TableHead className="text-right">Unit.</TableHead>
                                <TableHead className="text-right">Desc.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {order.items.map((item) => (
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
        </div>
      ) : null}

      {cancelMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao cancelar venda</AlertTitle>
          <AlertDescription>
            {cancelMutation.error instanceof Error
              ? cancelMutation.error.message
              : "Não foi possível cancelar a venda."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[560px] flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-primary" />
            Carregando vendas...
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar vendas</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Erro ao carregar vendas."}
            </AlertDescription>
          </Alert>
        ) : null}

        {data && data.items.length === 0 && serviceOrdersCompleted.length === 0 && !isLoading ? (
          <Empty className="min-h-[220px]">
            <span className="rounded-full bg-muted/60 p-2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <EmptyTitle className="text-sm font-medium">Nenhuma venda encontrada</EmptyTitle>
            <EmptyDescription>
              Nenhuma venda ou ordem de serviço encontrada para os filtros aplicados.
            </EmptyDescription>
          </Empty>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="grid gap-3 p-3 md:hidden">
              {data.items.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-lg border border-border bg-background p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        Venda #{sale.code}
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                        {sale.client?.name ?? "Caixa livre"}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {sale.sector?.name ?? sale.sectorName ?? "Sem setor"} •{" "}
                        {paymentLabel(sale.paymentMethod)}
                      </p>
                    </div>

                    {sale.status === "CONCLUIDA" ? (
                      <Badge
                        variant="default"
                        className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                      >
                        <span className="status-dot-active" />
                        Concluída
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 text-muted-foreground"
                      >
                        <span className="status-dot-inactive" />
                        Cancelada
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Funcionário</p>
                      <p className="truncate font-medium">{sale.responsible}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(sale.total)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                  </div>

                  {expandedId === sale.id ? (
                    <div className="mt-3 rounded-md border border-border bg-muted/20">
                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border p-3 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Number(item.quantity)} x {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(item.total)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desc. {formatCurrency(item.discount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-1.5"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === sale.id ? null : sale.id,
                        )
                      }
                    >
                      <ChevronsUpDown className="size-3" />
                      {expandedId === sale.id ? "Ocultar" : "Itens"}
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      className="h-10 gap-1.5"
                      disabled={sale.status === "CANCELADA" || cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(sale)}
                    >
                      <CircleX className="size-3" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-24 font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Venda
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Setor
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Funcionário
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Pagamento
                  </TableHead>
                  <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Total
                  </TableHead>
                  <TableHead className="text-center font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-44 text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.items.map((sale) => (
                  <Fragment key={sale.id}>
                    <TableRow className="group transition-colors hover:bg-accent/40">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        #{sale.code}
                      </TableCell>

                      <TableCell className="font-medium text-foreground">
                        {sale.client?.name ?? "Caixa livre"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {sale.sector?.name ?? sale.sectorName ?? "-"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {sale.responsible}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {paymentLabel(sale.paymentMethod)}
                      </TableCell>

                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDateTime(sale.createdAt)}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>

                      <TableCell className="text-center">
                        {sale.status === "CONCLUIDA" ? (
                          <Badge
                            variant="default"
                            className="gap-1.5 border-0 bg-primary/15 text-primary hover:bg-primary/20"
                          >
                            <span className="status-dot-active" />
                            Concluída
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="gap-1.5 text-muted-foreground"
                          >
                            <span className="status-dot-inactive" />
                            Cancelada
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                            onClick={() =>
                              setExpandedId((current) =>
                                current === sale.id ? null : sale.id,
                              )
                            }
                          >
                            <ChevronsUpDown className="size-3" />
                            Itens
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 gap-1.5 px-3 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                            disabled={sale.status === "CANCELADA" || cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(sale)}
                          >
                            <CircleX className="size-3" />
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
                                <TableRow className="hover:bg-transparent">
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
          </div>
        ) : null}
      </div>

      {data && totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{data.page ?? page}</span> de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
            {data.total ? ` - ${data.total} vendas` : ""}
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

      <PdvSaleDialog
        open={pdvOpen}
        defaultResponsible={selectedServiceOrder?.responsible ?? defaultResponsible}
        onClose={handleClosePdv}
        mode={selectedServiceOrder ? "SERVICE_ORDER" : "PDV"}
        serviceOrderId={selectedServiceOrder?.id}
        serviceOrderCode={selectedServiceOrder?.code}
      />
    </section>
  );
}
