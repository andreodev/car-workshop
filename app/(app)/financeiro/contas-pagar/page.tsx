"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Check, Download, Eye, Wrench } from "lucide-react";

import {
  fetchFinancialAccounts,
  fetchMechanicCommissions,
  updateFinancialAccountStatus,
} from "../finance-api";
import {
  getFinancialStatusLabel,
  getFinancialTypeLabel,
  getPaymentMethodLabel,
} from "../status";
import type {
  FinancialAccount,
  FinancialAccountStatus,
  FinancialAccountType,
  MechanicCommissionAccount,
  MechanicCommissionPeriod,
  MechanicCommissionStatusFilter,
  MechanicPaymentInfo,
} from "../types";

import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const periodOptions: Array<{ value: MechanicCommissionPeriod; label: string }> = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

const commissionStatusOptions: Array<{
  value: MechanicCommissionStatusFilter;
  label: string;
  totalLabel: string;
  empty: string;
}> = [
  {
    value: "pending",
    label: "A pagar",
    totalLabel: "A pagar",
    empty: "Nenhuma comissão de mecânico a pagar neste período.",
  },
  {
    value: "paid",
    label: "Pagas",
    totalLabel: "Pago",
    empty: "Nenhuma comissão de mecânico paga neste período.",
  },
  {
    value: "all",
    label: "Todas",
    totalLabel: "Total",
    empty: "Nenhuma comissão de mecânico neste período.",
  },
];

function formatCurrency(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPercent(value: string | null) {
  const parsed = Number(value ?? Number.NaN);

  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}%`;
}

function formatVehicle(account: MechanicCommissionAccount) {
  const vehicle = account.serviceOrder?.vehicle;

  if (!vehicle) {
    return "-";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model].filter(Boolean).join(" - ");
}

function formatSource(account: MechanicCommissionAccount) {
  if (account.sourceItems.length === 0) {
    return account.notes ?? account.description;
  }

  return account.sourceItems
    .map((item) => `${item.description} (${formatCurrency(item.commissionBase)})`)
    .join("; ");
}

function formatPixKeyType(value: string | null | undefined) {
  const labels: Record<string, string> = {
    CPF: "CPF",
    CNPJ: "CNPJ",
    CELULAR: "Celular",
    EMAIL: "E-mail",
    ALEATORIA: "Chave aleatória",
    OUTRA: "Outra",
  };

  return value ? labels[value] ?? value : "-";
}

function hasPaymentInfo(payment: MechanicPaymentInfo | null | undefined) {
  return Boolean(
    payment?.paymentKey ||
      payment?.paymentKeyHolder ||
      payment?.paymentBank ||
      payment?.paymentKeyType
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function accountResponsible(account: FinancialAccount) {
  return (
    account.supplier?.name ??
    account.client?.name ??
    account.counterparty ??
    "Sem responsável"
  );
}

function CommissionDetailsDialog({
  account,
  open,
  onOpenChange,
}: {
  account: MechanicCommissionAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalhes da comissão</DialogTitle>
          <DialogDescription>
            Origem do valor que será pago ao mecânico.
          </DialogDescription>
        </DialogHeader>

        {account ? (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                label="Comissão"
                value={formatCurrency(account.amount)}
              />
              <DetailItem
                label="Base comissionável"
                value={formatCurrency(account.commissionBase)}
              />
              <DetailItem
                label="Percentual"
                value={formatPercent(account.commissionPercent)}
              />
              <DetailItem
                label="Vencimento"
                value={formatDate(account.dueDate)}
              />
              <DetailItem
                label="Criada em"
                value={formatDateTime(account.createdAt)}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                label="Ordem de serviço"
                value={
                  account.serviceOrder
                    ? `#${account.serviceOrder.code}`
                    : account.documentNumber ?? "-"
                }
              />
              <DetailItem label="Placa" value={formatVehicle(account)} />
              <DetailItem
                label="Cliente"
                value={account.serviceOrder?.client?.name ?? "-"}
              />
              <DetailItem
                label="Total da OS"
                value={formatCurrency(account.serviceOrder?.total)}
              />
            </section>

            {hasPaymentInfo(account.mechanicPayment) ? (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem
                  label="Chave PIX"
                  value={formatValue(account.mechanicPayment?.paymentKey)}
                />
                <DetailItem
                  label="Nome da chave"
                  value={formatValue(account.mechanicPayment?.paymentKeyHolder)}
                />
                <DetailItem
                  label="Banco"
                  value={formatValue(account.mechanicPayment?.paymentBank)}
                />
                <DetailItem
                  label="Tipo da chave"
                  value={formatPixKeyType(account.mechanicPayment?.paymentKeyType)}
                />
              </section>
            ) : null}

            <section className="rounded-md border">
              <div className="border-b p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Itens que geraram a comissão
                </h3>
                <p className="text-xs text-muted-foreground">
                  A base usa a base comissionável do item; quando ela não existe, usa o total dos serviços.
                </p>
              </div>

              {account.sourceItems.length ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Item</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Unitário</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {account.sourceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.description}
                          </TableCell>
                          <TableCell>
                            {item.type === "SERVICE" ? "Serviço" : "Produto"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.discount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.commissionBase)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  Nenhum item de origem vinculado a esta comissão. Confira a observação da conta financeira.
                </div>
              )}
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Conta financeira</p>
                <p className="mt-1 font-medium text-foreground">
                  #{account.code} {account.description}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Documento: {account.documentNumber ?? "-"}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Observação</p>
                <p className="mt-1 text-sm text-foreground">
                  {account.notes ?? "-"}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function statusBadge(status: FinancialAccountStatus) {
  const className =
    status === "PAGA"
      ? "bg-emerald-600/10 text-emerald-700"
      : status === "VENCIDA"
        ? "bg-amber-500/10 text-amber-700"
        : status === "CANCELADA"
          ? "bg-destructive/10 text-destructive"
          : "bg-sky-600/10 text-sky-700";

  return (
    <Badge className={className}>
      {getFinancialStatusLabel(status)}
    </Badge>
  );
}

function PayableDetailsDialog({
  account,
  open,
  onOpenChange,
}: {
  account: FinancialAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da conta a pagar</DialogTitle>
          <DialogDescription>
            Informações completas da conta pendente selecionada.
          </DialogDescription>
        </DialogHeader>

        {account ? (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                label="Valor"
                value={formatCurrency(account.amount)}
              />
              <DetailItem
                label="Valor pago"
                value={formatCurrency(account.paidAmount)}
              />
              <DetailItem
                label="Vencimento"
                value={formatDate(account.dueDate)}
              />
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-2">{statusBadge(account.status)}</div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Conta financeira</p>
                <p className="mt-1 font-medium text-foreground">
                  #{account.code} {account.description}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getFinancialTypeLabel(account.type)} · {formatValue(account.category)}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="mt-1 font-medium text-foreground">
                  {accountResponsible(account)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forma: {getPaymentMethodLabel(account.paymentMethod)}
                </p>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                label="Documento"
                value={formatValue(account.documentNumber)}
              />
              <DetailItem
                label="Pagamento"
                value={formatDate(account.paymentDate)}
              />
              <DetailItem
                label="Criada em"
                value={formatDateTime(account.createdAt)}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Origem vinculada</p>
                <p className="mt-1 font-medium text-foreground">
                  {account.serviceOrder
                    ? `OS #${account.serviceOrder.code}`
                    : account.supplierOrder
                      ? `Pedido #${account.supplierOrder.code}`
                      : "-"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {account.serviceOrder
                    ? `Status da OS: ${account.serviceOrder.status}`
                    : account.supplierOrder
                      ? `Status do pedido: ${account.supplierOrder.status}`
                      : "Sem origem vinculada."}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="mt-1 text-sm text-foreground">
                  {formatValue(account.notes)}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-rose-500/10 text-rose-700">
          <ArrowUpRight className="size-5" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <h2 className="text-2xl font-bold text-rose-700">{value}</h2>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [commissionPeriod, setCommissionPeriod] =
    useState<MechanicCommissionPeriod>("weekly");
  const [commissionStatus, setCommissionStatus] =
    useState<MechanicCommissionStatusFilter>("pending");
  const [selectedCommission, setSelectedCommission] =
    useState<MechanicCommissionAccount | null>(null);
  const [selectedPayable, setSelectedPayable] =
    useState<FinancialAccount | null>(null);
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);

  const accountsQuery = useQuery({
    queryKey: ["financial-payables"],
    queryFn: () =>
      fetchFinancialAccounts({
        page: 1,
        pageSize: 9999,
        search: "",
        type: "PAGAR" as FinancialAccountType,
      }),
    staleTime: 30_000,
  });

  const mechanicCommissionsQuery = useQuery({
    queryKey: ["mechanic-commissions-payable", commissionPeriod, commissionStatus],
    queryFn: () =>
      fetchMechanicCommissions({
        period: commissionPeriod,
        status: commissionStatus,
      }),
    staleTime: 30_000,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      await Promise.all(
        accountIds.map((accountId) =>
          updateFinancialAccountStatus(accountId, "PAGA")
        )
      );

      return accountIds.length;
    },
    onSuccess: (accountsCount, accountIds) => {
      setSelectedCommissionIds((current) =>
        current.filter((id) => !accountIds.includes(id))
      );
      queryClient.invalidateQueries({ queryKey: ["financial-payables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["mechanic-commissions-payable"] });
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] });

      toast({
        title:
          accountsCount > 1
            ? "Comissões marcadas como pagas"
            : "Conta marcada como paga",
        description:
          accountsCount > 1
            ? `${accountsCount} pagamentos foram registrados e o caixa foi atualizado.`
            : "O pagamento foi registrado e o caixa foi atualizado.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar como paga",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento.",
        variant: "destructive",
      });
    },
  });

  const pendingAccounts = useMemo(() => {
    return (accountsQuery.data?.items ?? []).filter(
      (account) =>
        account.status === "ABERTA" ||
        account.status === "VENCIDA"
    );
  }, [accountsQuery.data]);

  const totalPayable = useMemo(() => {
    return pendingAccounts.reduce(
      (acc, account) => acc + Number(account.amount ?? 0),
      0
    );
  }, [pendingAccounts]);

  const mechanicCommissionTotal = Number(
    mechanicCommissionsQuery.data?.summary.total ?? 0
  );
  const selectedCommissionStatusOption =
    commissionStatusOptions.find((option) => option.value === commissionStatus) ??
    commissionStatusOptions[0];

  const groupedPayables = useMemo(() => {
    return pendingAccounts
      .filter((account) => account.category?.toLowerCase() !== "comissão mecânico")
      .reduce<
        Record<
          string,
          {
            total: number;
            items: FinancialAccount[];
          }
        >
      >((acc, account) => {
        const key =
          account.client?.name ??
          account.counterparty ??
          "Sem responsável";

        if (!acc[key]) {
          acc[key] = {
            total: 0,
            items: [],
          };
        }

        acc[key].total += Number(account.amount ?? 0);
        acc[key].items.push(account);

        return acc;
      }, {});
  }, [pendingAccounts]);

  const groupedEntries = Object.entries(groupedPayables).sort(
    (a, b) => b[1].total - a[1].total
  );

  const handleMarkAsPaid = (accountId: string) => {
    if (!confirm("Marcar esta conta como paga? O lançamento será registrado no caixa.")) {
      return;
    }

    markAsPaidMutation.mutate([accountId]);
  };

  const handleMarkSelectedCommissionsAsPaid = (
    mechanicName: string,
    accounts: MechanicCommissionAccount[]
  ) => {
    const selectedPendingIds = accounts
      .filter(
        (account) =>
          account.status !== "PAGA" && selectedCommissionIds.includes(account.id)
      )
      .map((account) => account.id);

    if (selectedPendingIds.length === 0) {
      return;
    }

    const confirmMessage =
      selectedPendingIds.length === 1
        ? `Marcar 1 comissão de ${mechanicName} como paga? O lançamento será registrado no caixa.`
        : `Marcar ${selectedPendingIds.length} comissões de ${mechanicName} como pagas? Os lançamentos serão registrados no caixa.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    markAsPaidMutation.mutate(selectedPendingIds);
  };

  const handleToggleCommission = (accountId: string, checked: boolean) => {
    setSelectedCommissionIds((current) => {
      if (checked) {
        return current.includes(accountId) ? current : [...current, accountId];
      }

      return current.filter((id) => id !== accountId);
    });
  };

  const handleToggleCommissionGroup = (
    accounts: MechanicCommissionAccount[],
    checked: boolean
  ) => {
    const pendingIds = accounts
      .filter((account) => account.status !== "PAGA")
      .map((account) => account.id);

    setSelectedCommissionIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...pendingIds]));
      }

      return current.filter((id) => !pendingIds.includes(id));
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Contas a pagar"
          description="Visualize tudo que ainda precisa ser pago, agrupado por responsável, mecânico ou fornecedor."
        />

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => router.push("/financeiro")}
        >
          <ArrowLeft className="size-4" />
          Voltar para financeiro
        </Button>
      </div>

      <SummaryCard
        label="Total pendente a pagar"
        value={formatCurrency(totalPayable)}
      />

      <section className="rounded-md border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Demais contas pendentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Contas a pagar agrupadas por responsável, fornecedor ou cliente.
          </p>
        </div>

        {accountsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Carregando contas a pagar...
          </div>
        ) : groupedEntries.length ? (
          <div className="divide-y">
            {groupedEntries.map(([groupName, group]) => (
              <div key={groupName} className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {groupName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.items.length} conta(s) pendente(s)
                    </p>
                  </div>

                  <p className="text-xl font-bold text-rose-700">
                    {formatCurrency(group.total)}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table className="min-w-[880px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Conta</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {group.items.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              #{account.code} {account.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {account.documentNumber || account.notes || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{account.category ?? "-"}</TableCell>
                          <TableCell>{formatDate(account.dueDate)}</TableCell>
                          <TableCell>{statusBadge(account.status)}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-700">
                            {formatCurrency(account.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                disabled={markAsPaidMutation.isPending}
                                onClick={() => handleMarkAsPaid(account.id)}
                              >
                                <Check className="size-4" />
                                Pagar
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => setSelectedPayable(account)}
                              >
                                <Eye className="size-4" />
                                Detalhes
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma conta a pagar fora das comissões de mecânico.
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-700">
              <Wrench className="size-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Comissões de mecânicos
              </h2>
              <p className="text-sm text-muted-foreground">
                Relatório por data de criação, com pendentes, pagas, placa, OS e base de cálculo.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-2">
              <div className="flex rounded-md border bg-background p-1">
                {commissionStatusOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={commissionStatus === option.value ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setSelectedCommissionIds([]);
                      setCommissionStatus(option.value);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="flex rounded-md border bg-background p-1">
                {periodOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={commissionPeriod === option.value ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setSelectedCommissionIds([]);
                      setCommissionPeriod(option.value);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {selectedCommissionStatusOption.totalLabel} no período
              </p>
              <p className="text-2xl font-bold text-rose-700">
                {formatCurrency(mechanicCommissionTotal)}
              </p>
            </div>
          </div>
        </div>

        {mechanicCommissionsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Carregando comissões de mecânicos...
          </div>
        ) : mechanicCommissionsQuery.data?.groups.length ? (
          <div className="divide-y">
            {mechanicCommissionsQuery.data.groups.map((group) => {
              const pendingGroupAccounts = group.accounts.filter(
                (account) => account.status !== "PAGA"
              );
              const selectedGroupAccounts = pendingGroupAccounts.filter((account) =>
                selectedCommissionIds.includes(account.id)
              );
              const selectedGroupTotal = selectedGroupAccounts.reduce(
                (acc, account) => acc + Number(account.amount ?? 0),
                0
              );
              const allGroupPendingSelected =
                pendingGroupAccounts.length > 0 &&
                selectedGroupAccounts.length === pendingGroupAccounts.length;

              return (
              <div key={group.mechanicName} className="p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {group.mechanicName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.accountsCount} comissão(ões) em {group.ordersCount} OS
                    </p>
                    {hasPaymentInfo(group.mechanicPayment) ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        PIX: {formatValue(group.mechanicPayment?.paymentKey)} ·{" "}
                        {formatValue(group.mechanicPayment?.paymentKeyHolder)} ·{" "}
                        {formatValue(group.mechanicPayment?.paymentBank)} ·{" "}
                        {formatPixKeyType(group.mechanicPayment?.paymentKeyType)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {pendingGroupAccounts.length > 0 ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="gap-2"
                        disabled={
                          markAsPaidMutation.isPending ||
                          selectedGroupAccounts.length === 0
                        }
                        onClick={() =>
                          handleMarkSelectedCommissionsAsPaid(
                            group.mechanicName,
                            group.accounts
                          )
                        }
                      >
                        <Check className="size-4" />
                        Pagar selecionadas
                      </Button>
                    ) : null}

                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {selectedGroupAccounts.length > 0
                          ? `${selectedGroupAccounts.length} selecionada(s)`
                          : selectedCommissionStatusOption.totalLabel}
                      </p>
                      <p className="text-xl font-bold text-rose-700">
                        {formatCurrency(
                          selectedGroupAccounts.length > 0
                            ? selectedGroupTotal
                            : group.total
                        )}
                      </p>
                    </div>

                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a
                        href={`/api/mechanics/commissions/pdf?period=${commissionPeriod}&status=${commissionStatus}&mechanicName=${encodeURIComponent(group.mechanicName)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-4" />
                        PDF
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table className="min-w-[1280px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allGroupPendingSelected}
                            disabled={
                              pendingGroupAccounts.length === 0 ||
                              markAsPaidMutation.isPending
                            }
                            aria-label={`Selecionar comissões pendentes de ${group.mechanicName}`}
                            onCheckedChange={(checked) =>
                              handleToggleCommissionGroup(
                                group.accounts,
                                checked === true
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Criação</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detalhes da comissão</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {group.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCommissionIds.includes(account.id)}
                              disabled={
                                account.status === "PAGA" ||
                                markAsPaidMutation.isPending
                              }
                              aria-label={`Selecionar comissão da conta ${account.code}`}
                              onCheckedChange={(checked) =>
                                handleToggleCommission(account.id, checked === true)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono">
                            {account.serviceOrder
                              ? `#${account.serviceOrder.code}`
                              : account.documentNumber ?? "-"}
                          </TableCell>
                          <TableCell>{formatVehicle(account)}</TableCell>
                          <TableCell>
                            {account.serviceOrder?.client?.name ?? "-"}
                          </TableCell>
                          <TableCell>{formatDate(account.createdAt)}</TableCell>
                          <TableCell>{formatDate(account.dueDate)}</TableCell>
                          <TableCell>{statusBadge(account.status)}</TableCell>
                          <TableCell className="max-w-[360px] text-sm text-muted-foreground">
                            <div className="line-clamp-2">{formatSource(account)}</div>
                            <div className="mt-1 text-xs">
                              Conta #{account.code} · {account.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(account.commissionBase)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(account.commissionPercent)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-rose-700">
                            {formatCurrency(account.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {account.status === "PAGA" ? null : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  disabled={markAsPaidMutation.isPending}
                                  onClick={() => handleMarkAsPaid(account.id)}
                                >
                                  <Check className="size-4" />
                                  Pagar
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => setSelectedCommission(account)}
                              >
                                <Eye className="size-4" />
                                Detalhes
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {selectedCommissionStatusOption.empty}
          </div>
        )}
      </section>
      <CommissionDetailsDialog
        account={selectedCommission}
        open={Boolean(selectedCommission)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCommission(null);
          }
        }}
      />
      <PayableDetailsDialog
        account={selectedPayable}
        open={Boolean(selectedPayable)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayable(null);
          }
        }}
      />
    </section>
  );
}
