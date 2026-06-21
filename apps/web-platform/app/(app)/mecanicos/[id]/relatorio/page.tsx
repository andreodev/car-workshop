"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { fetchMechanicReport } from "../../mechanic-api";
import type {
  MechanicReportFinancialAccount,
  MechanicReportOrder,
  MechanicReportOrderItem,
  MechanicReportPeriod,
} from "../../types";
import { getServiceOrderStatusOption } from "../../../ordens-servico/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Header from "@/components/ui/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MechanicReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type MechanicReportItemWithOrder = MechanicReportOrderItem & {
  order: {
    id: string;
    code: number;
    status: MechanicReportOrder["status"];
    entryAt: string;
    client: MechanicReportOrder["client"];
    vehicle: MechanicReportOrder["vehicle"];
  };
};

type MechanicReportAccountWithOrder = MechanicReportFinancialAccount & {
  order: MechanicReportOrder;
};

const periodOptions: Array<{ value: MechanicReportPeriod; label: string }> = [
  { value: "daily", label: "Hoje" },
  { value: "weekly", label: "Semana" },
  { value: "monthly", label: "Mês" },
  { value: "all", label: "Tudo" },
];

function normalizePeriod(value: string | null): MechanicReportPeriod {
  return periodOptions.some((option) => option.value === value)
    ? (value as MechanicReportPeriod)
    : "monthly";
}

function formatCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatPercent(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);

  if (isoDate) {
    const [year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

function formatVehicleLabel(vehicle: MechanicReportOrder["vehicle"]) {
  if (!vehicle) {
    return "-";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model].filter(Boolean).join(" - ");
}

function formatVehicle(order: MechanicReportOrder) {
  return formatVehicleLabel(order.vehicle);
}

function financialStatusBadge(status: MechanicReportFinancialAccount["status"]) {
  const className =
    status === "PAGA"
      ? "bg-emerald-600/10 text-emerald-700"
      : status === "VENCIDA"
        ? "bg-amber-500/10 text-amber-700"
        : status === "CANCELADA"
          ? "bg-destructive/10 text-destructive"
          : "bg-sky-600/10 text-sky-700";

  return <Badge className={className}>{status}</Badge>;
}

function paymentMethodLabel(value: MechanicReportFinancialAccount["paymentMethod"]) {
  const labels: Record<NonNullable<MechanicReportFinancialAccount["paymentMethod"]>, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "Pix",
    CARTAO_CREDITO: "Cartão crédito",
    CARTAO_DEBITO: "Cartão débito",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };

  return value ? labels[value] : "-";
}

function itemCatalogLabel(item: MechanicReportOrderItem) {
  if (!item.catalogItem) {
    return "-";
  }

  return `#${item.catalogItem.code} ${item.catalogItem.name}`;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value || "-"}
      </p>
    </div>
  );
}

function ServiceItemDetailsDialog({
  item,
  onOpenChange,
}: {
  item: MechanicReportItemWithOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) {
    return null;
  }

  const statusOption = getServiceOrderStatusOption(item.order.status);

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do serviço</DialogTitle>
          <DialogDescription>
            OS #{item.order.code} • {item.order.client?.name ?? "Cliente não informado"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Serviço" value={item.description} />
          <DetailItem label="Catálogo" value={itemCatalogLabel(item)} />
          <DetailItem label="Cliente" value={item.order.client?.name ?? "-"} />
          <DetailItem label="Veículo" value={formatVehicleLabel(item.order.vehicle)} />
          <DetailItem label="Setor" value={item.sector?.name ?? "-"} />
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
              Status da OS
            </p>
            <div className="mt-1">
              <Badge variant={statusOption.variant} className={statusOption.className}>
                {statusOption.label}
              </Badge>
            </div>
          </div>
          <DetailItem label="Entrada" value={formatDateTime(item.order.entryAt)} />
          <DetailItem label="Quantidade" value={String(item.quantity)} />
          <DetailItem label="Valor unitário" value={formatCurrency(item.unitPrice)} />
          <DetailItem label="Desconto" value={formatCurrency(item.discount)} />
          <DetailItem label="Total do serviço" value={formatCurrency(item.total)} />
          <DetailItem label="Base da comissão" value={formatCurrency(item.commissionBase)} />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ordens-servico/${item.order.id}/detalhes`}>
              Abrir OS
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommissionAccountDetailsDialog({
  account,
  onOpenChange,
}: {
  account: MechanicReportAccountWithOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!account) {
    return null;
  }

  return (
    <Dialog open={Boolean(account)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da comissão financeira</DialogTitle>
          <DialogDescription>
            Conta #{account.code} vinculada à OS #{account.order.code}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Conta" value={`#${account.code}`} />
          <DetailItem label="OS" value={`#${account.order.code}`} />
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
              Status
            </p>
            <div className="mt-1">{financialStatusBadge(account.status)}</div>
          </div>
          <DetailItem label="Documento" value={account.documentNumber ?? "-"} />
          <DetailItem label="Vencimento" value={formatDate(account.dueDate)} />
          <DetailItem label="Pagamento" value={formatDate(account.paymentDate)} />
          <DetailItem label="Método" value={paymentMethodLabel(account.paymentMethod)} />
          <DetailItem label="Valor" value={formatCurrency(account.amount)} />
          <DetailItem
            label="Valor pago"
            value={formatCurrency(account.paidAmount ?? "0")}
          />
          <DetailItem label="Cliente" value={account.order.client?.name ?? "-"} />
          <DetailItem label="Veículo" value={formatVehicle(account.order)} />
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">
            Observação
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {account.notes ?? account.description ?? "-"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailsDialog({
  order,
  onOpenChange,
}: {
  order: MechanicReportOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!order) {
    return null;
  }

  const statusOption = getServiceOrderStatusOption(order.status);

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da OS #{order.code}</DialogTitle>
          <DialogDescription>
            Resumo dos serviços deste mecânico dentro da ordem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Cliente" value={order.client?.name ?? "-"} />
          <DetailItem label="Veículo" value={formatVehicle(order)} />
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
              Status
            </p>
            <div className="mt-1">
              <Badge variant={statusOption.variant} className={statusOption.className}>
                {statusOption.label}
              </Badge>
            </div>
          </div>
          <DetailItem label="Entrada" value={formatDateTime(order.entryAt)} />
          <DetailItem label="Previsão" value={formatDateTime(order.estimatedAt)} />
          <DetailItem label="Atualização" value={formatDateTime(order.updatedAt)} />
          <DetailItem label="Itens dele" value={String(order.items.length)} />
          <DetailItem label="Serviços" value={formatCurrency(order.total)} />
          <DetailItem label="Base comissão" value={formatCurrency(order.serviceTotal)} />
          <DetailItem label="Comissão" value={formatCurrency(order.commissionTotal)} />
          <DetailItem
            label="Comissão financeira"
            value={
              order.commissionAccounts.length
                ? `${order.commissionAccounts.length} conta(s)`
                : "Sem conta"
            }
          />
          <DetailItem label="Local" value={order.location ?? "-"} />
        </div>

        <div className="rounded-md border">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Serviços da OS</p>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sector?.name ?? "Sem setor"} • {itemCatalogLabel(item)}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold">{formatCurrency(item.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Base {formatCurrency(item.commissionBase)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ordens-servico/${order.id}/detalhes`}>
              Abrir OS completa
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrdersTable({ orders }: { orders: MechanicReportOrder[] }) {
  const [selectedOrder, setSelectedOrder] = useState<MechanicReportOrder | null>(
    null,
  );

  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhuma OS encontrada nesta visão.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead className="text-right">Itens</TableHead>
            <TableHead>Comissão financeira</TableHead>
            <TableHead className="text-right">Base comissão</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-right">Serviços</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusOption = getServiceOrderStatusOption(order.status);

            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono">#{order.code}</TableCell>
                <TableCell className="font-medium">{order.client?.name ?? "-"}</TableCell>
                <TableCell>{formatVehicle(order)}</TableCell>
                <TableCell>
                  <Badge variant={statusOption.variant} className={statusOption.className}>
                    {statusOption.label}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(order.entryAt)}</TableCell>
                <TableCell className="text-right">{order.items.length}</TableCell>
                <TableCell>
                  {order.commissionAccounts.length ? (
                    <div className="flex flex-wrap gap-1">
                      {order.commissionAccounts.map((account) => (
                        <span key={account.id}>{financialStatusBadge(account.status)}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sem conta</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(order.serviceTotal)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.commissionTotal)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    Ver detalhes
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <OrderDetailsDialog
        order={selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      />
    </div>
  );
}

function ServiceItemsTable({
  items,
}: {
  items: MechanicReportItemWithOrder[];
}) {
  const [selectedItem, setSelectedItem] =
    useState<MechanicReportItemWithOrder | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhum serviço encontrado para este mecânico.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Catálogo</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Unitário</TableHead>
            <TableHead className="text-right">Desconto</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono">#{item.order.code}</TableCell>
              <TableCell className="font-medium">{item.order.client?.name ?? "-"}</TableCell>
              <TableCell>{formatVehicleLabel(item.order.vehicle)}</TableCell>
              <TableCell className="min-w-[220px]">{item.description}</TableCell>
              <TableCell>{itemCatalogLabel(item)}</TableCell>
              <TableCell>{item.sector?.name ?? "-"}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(item.commissionBase)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(item)}
                >
                  Ver detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ServiceItemDetailsDialog
        item={selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      />
    </div>
  );
}

function CommissionAccountsTable({ orders }: { orders: MechanicReportOrder[] }) {
  const [selectedAccount, setSelectedAccount] =
    useState<MechanicReportAccountWithOrder | null>(null);
  const accounts: MechanicReportAccountWithOrder[] = orders.flatMap((order) =>
    order.commissionAccounts.map((account) => ({
      ...account,
      order,
    }))
  );

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhuma conta de comissão gerada para as OS deste mecânico.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[1120px]">
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Observação</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Pago</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono">#{account.code}</TableCell>
              <TableCell className="font-mono">#{account.order.code}</TableCell>
              <TableCell>{financialStatusBadge(account.status)}</TableCell>
              <TableCell>{formatDate(account.dueDate)}</TableCell>
              <TableCell>{formatDate(account.paymentDate)}</TableCell>
              <TableCell>{paymentMethodLabel(account.paymentMethod)}</TableCell>
              <TableCell className="max-w-[360px] text-sm text-muted-foreground">
                <div className="line-clamp-2">{account.notes ?? account.description}</div>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(account.amount)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(account.paidAmount ?? "0")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAccount(account)}
                >
                  Ver detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CommissionAccountDetailsDialog
        account={selectedAccount}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAccount(null);
          }
        }}
      />
    </div>
  );
}

export default function MechanicReportClient({ params }: MechanicReportPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const period = normalizePeriod(searchParams.get("period"));
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mechanic-report", id, period],
    queryFn: () => fetchMechanicReport(id, { period }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando relatório do mecânico...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o relatório."}
      </div>
    );
  }

  const metrics = [
    { label: "OS no período", value: data.summary.totalOrders },
    { label: "Serviços feitos", value: data.summary.serviceItemsCount },
    { label: "OS ativas", value: data.summary.activeOrders },
    { label: "Concluídas", value: data.summary.completedOrders },
    { label: "Concluídas no período", value: data.summary.periodCompletedOrders },
  ];
  const financialMetrics = [
    { label: "Gerada", value: data.summary.generatedCommissionTotal },
    { label: "Pendente", value: data.summary.pendingCommissionTotal },
    { label: "Vencida", value: data.summary.overdueCommissionTotal },
    { label: "Paga", value: data.summary.paidCommissionTotal },
  ];

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/mecanicos">
              <ArrowLeft className="size-4" />
              Voltar para mecânicos
            </Link>
          </Button>
          <Header
            title={`Relatório de ${data.mechanic.name}`}
            description={`Resumo dos serviços e comissões do período: ${data.period.label}.`}
          />
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-fit">
              Comissão {formatPercent(data.summary.commissionPercent)}
            </Badge>
            <Badge variant={data.mechanic.active ? "default" : "secondary"} className="h-fit">
              {data.mechanic.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                variant={period === option.value ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/mecanicos/${id}/relatorio?period=${option.value}`}>
                  {option.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Resumo do período</h2>
            <p className="text-xs text-muted-foreground">
              Valores calculados pelos itens de serviço atribuídos a este mecânico.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Comissão prevista</h2>
            <p className="text-xs text-muted-foreground">
              Base de comissão do período vezes {formatPercent(data.summary.commissionPercent)}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.summary.serviceRevenue)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Comissão</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.summary.commissionTotal)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Comissões financeiras</h2>
          <p className="text-xs text-muted-foreground">
            Contas a pagar geradas para as OS que aparecem neste relatório.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {financialMetrics.map((metric) => (
            <div key={metric.label} className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(metric.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Distribuição por status</h2>
          <p className="text-xs text-muted-foreground">
            Quantidade de OS e valor dos serviços vinculados ao mecânico.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {data.statusSummary.map((item) => {
            const statusOption = getServiceOrderStatusOption(item.status);

            return (
              <div key={item.status} className="rounded-md border bg-muted/20 p-3">
                <Badge variant={statusOption.variant} className={statusOption.className}>
                  {statusOption.label}
                </Badge>
                <p className="mt-3 text-xl font-semibold text-foreground">{item.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.total)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Serviços detalhados</h2>
          <p className="text-xs text-muted-foreground">
            Itens de serviço atribuídos ao mecânico, com catálogo, setor e base de comissão.
          </p>
        </div>
        <ServiceItemsTable items={data.recentItems} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Comissões financeiras</h2>
          <p className="text-xs text-muted-foreground">
            Contas a pagar de comissão geradas para as OS deste mecânico.
          </p>
        </div>
        <CommissionAccountsTable orders={data.recentOrders} />
      </section>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">OS do período</h2>
          <p className="text-xs text-muted-foreground">
            Ordens com serviços vinculados ao mecânico dentro do filtro selecionado.
          </p>
        </div>
        <OrdersTable orders={data.recentOrders} />
      </section>
    </section>
  );
}
