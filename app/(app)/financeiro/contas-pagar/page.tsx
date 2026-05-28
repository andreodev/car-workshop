"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { fetchFinancialAccounts } from "../finance-api";
import type {
  FinancialAccount,
  FinancialAccountStatus,
  FinancialAccountType,
} from "../types";

import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      {status}
    </Badge>
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

  const groupedPayables = useMemo(() => {
    return pendingAccounts.reduce<
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

      {accountsQuery.isLoading ? (
        <div className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          Carregando contas a pagar...
        </div>
      ) : groupedEntries.length ? (
        <div className="space-y-6">
          {groupedEntries.map(([responsible, group]) => (
            <div
              key={responsible}
              className="overflow-hidden rounded-md border bg-card shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {responsible}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {group.items.length} conta(s) pendente(s)
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total a pagar
                  </p>

                  <p className="text-2xl font-bold text-rose-700">
                    {formatCurrency(group.total)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Conta</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead className="text-right">
                        Valor
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {group.items.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="font-medium">
                            #{account.code} {account.description}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {account.documentNumber || "-"}
                          </div>
                        </TableCell>

                        <TableCell>
                          {account.category ?? "-"}
                        </TableCell>

                        <TableCell>
                          {formatDate(account.dueDate)}
                        </TableCell>

                        <TableCell>
                          {statusBadge(account.status)}
                        </TableCell>

                        <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                          {account.notes ?? "-"}
                        </TableCell>

                        <TableCell className="text-right font-semibold text-rose-700">
                          {formatCurrency(account.amount)}
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
        <div className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          Nenhuma conta pendente encontrada.
        </div>
      )}
    </section>
  );
}