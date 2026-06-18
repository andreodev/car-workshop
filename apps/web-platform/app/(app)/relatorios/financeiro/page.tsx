import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Wallet } from "lucide-react";

import { ReportMetric, ReportPage } from "../_components/report-page";
import {
  accountStatusLabels,
  formatCurrency,
  formatDate,
  formatInteger,
  getFinanceReportData,
  groupCount,
} from "@/app/lib/reports";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FinanceReportPage() {
  const data = await getFinanceReportData();

  return (
    <ReportPage
      title="Relatorio financeiro"
      description="Contas, fluxo de caixa, receitas, despesas e resultado do mes."
      exportType="finance"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          label="Entradas"
          value={formatCurrency(data.cashFlow.entries)}
          detail="Receitas no mes atual"
          icon={ArrowUpRight}
        />
        <ReportMetric
          label="Saidas"
          value={formatCurrency(data.cashFlow.exits)}
          detail="Despesas no mes atual"
          icon={ArrowDownLeft}
        />
        <ReportMetric
          label="Resultado"
          value={formatCurrency(data.cashFlow.result)}
          detail="Receitas menos despesas"
          icon={CircleDollarSign}
        />
        <ReportMetric
          label="Saldo final"
          value={formatCurrency(data.cashFlow.finalBalance)}
          detail="Saldo projetado do caixa"
          icon={Wallet}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Contas</CardTitle>
            <CardDescription>A pagar, a receber e status atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-xs text-emerald-700">A receber</span>
                <strong className="block font-heading text-lg text-emerald-800">
                  {formatCurrency(data.accounts.receivableOpen)}
                </strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-xs text-red-700">A pagar</span>
                <strong className="block font-heading text-lg text-red-800">
                  {formatCurrency(data.accounts.payableOpen)}
                </strong>
              </div>
            </div>
            {data.accounts.groups.map((group) => (
              <div
                key={`${group.type}-${group.status}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs">
                  {group.type === "RECEBER" ? "Receber" : "Pagar"} -{" "}
                  {accountStatusLabels[group.status]}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{formatInteger(groupCount(group))}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatCurrency(group._sum?.amount)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Movimentos do mes</CardTitle>
            <CardDescription>Entradas e saidas mais recentes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.recentEvents.map((event, index) => (
              <div
                key={`${event.date.toISOString()}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{event.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {event.category} - {formatDate(event.date)}
                  </span>
                </span>
                <span className={event.type === "ENTRADA" ? "text-emerald-700" : "text-red-700"}>
                  {event.type === "ENTRADA" ? "+" : "-"} {formatCurrency(event.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ReportPage>
  );
}
