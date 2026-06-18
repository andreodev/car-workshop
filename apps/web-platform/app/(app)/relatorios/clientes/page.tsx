import Link from "next/link";
import { UserCheck, UserRoundX, Users } from "lucide-react";

import { EmptyReportState, ReportMetric, ReportPage } from "../_components/report-page";
import {
  formatCurrency,
  formatDate,
  formatInteger,
  getClientReportData,
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

export default async function ClientReportPage() {
  const data = await getClientReportData();

  return (
    <ReportPage
      title="Relatorio de clientes"
      description="Maiores compradores, clientes inativos e recorrencia."
      exportType="clients"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <ReportMetric
          label="Clientes com compras"
          value={formatInteger(data.topClients.length)}
          detail="Com vendas ou OS finalizadas"
          icon={Users}
        />
        <ReportMetric
          label="Inativos"
          value={formatInteger(data.inactiveClients.length)}
          detail="Sem movimento recente ou marcados inativos"
          icon={UserRoundX}
        />
        <ReportMetric
          label="Melhor cliente"
          value={data.topClients[0] ? formatCurrency(data.topClients[0].total) : formatCurrency(0)}
          detail={data.topClients[0]?.name ?? "Sem dados"}
          icon={UserCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Mais compraram</CardTitle>
            <CardDescription>Ranking por total em vendas e OS.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.topClients.length > 0 ? (
              data.topClients.slice(0, 20).map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatInteger(client.sales)} vendas e {formatInteger(client.orders)} OS
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatCurrency(client.total)}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyReportState>Sem compras registradas.</EmptyReportState>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Clientes inativos</CardTitle>
            <CardDescription>Sem compras recentes ou status inativo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.inactiveClients.length > 0 ? (
              data.inactiveClients.slice(0, 20).map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Ultimo movimento: {formatDate(client.lastActivity)}
                    </span>
                  </span>
                  <Badge variant={client.status === "INATIVO" ? "secondary" : "outline"}>
                    {client.status === "INATIVO" ? "Inativo" : "90+ dias"}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyReportState>Nenhum cliente inativo encontrado.</EmptyReportState>
            )}
          </CardContent>
        </Card>
      </div>
    </ReportPage>
  );
}
