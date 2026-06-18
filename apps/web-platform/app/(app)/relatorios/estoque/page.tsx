import Link from "next/link";
import { Boxes } from "lucide-react";

import { EmptyReportState, ReportMetric, ReportPage } from "../_components/report-page";
import {
  formatDate,
  formatInteger,
  formatQuantity,
  getStockReportData,
  stockTypeLabels,
} from "@/app/lib/reports";
import { requireTenantMembership } from "@/app/lib/tenant-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function StockReportPage() {
  const tenant = await requireTenantMembership();
  const data = await getStockReportData(tenant.tenantId);
  const totalMovements = Object.values(data.summary).reduce((sum, item) => sum + item.count, 0);

  return (
    <ReportPage
      title="Relatorio de estoque"
      description="Produtos abaixo do minimo e entradas/saidas no periodo."
      exportType="stock"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {["ENTRADA", "SAIDA", "ESTORNO", "AJUSTE"].map((type) => {
          const summary = data.summary[type] ?? { count: 0, quantity: 0 };

          return (
            <ReportMetric
              key={type}
              label={stockTypeLabels[type] ?? type}
              value={formatQuantity(summary.quantity)}
              detail={`${formatInteger(summary.count)} movimentos`}
              icon={Boxes}
            />
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Baixo estoque</CardTitle>
            <CardDescription>Produtos iguais ou abaixo do minimo cadastrado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.lowStockItems.length > 0 ? (
              data.lowStockItems.slice(0, 16).map((item) => (
                <Link
                  key={item.id}
                  href={`/produtos/${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      #{item.code} - {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Unidade: {item.unit ?? "-"}</span>
                  </span>
                  <Badge variant="destructive">
                    {formatQuantity(item.stockCurrent)} / {formatQuantity(item.stockMinimum)}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyReportState>Nenhum produto abaixo do minimo.</EmptyReportState>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Movimentos</CardTitle>
            <CardDescription>{formatInteger(totalMovements)} movimentos no mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="max-w-56 truncate">
                        #{movement.catalogItem.code} - {movement.catalogItem.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.type === "SAIDA" ? "destructive" : "outline"}>
                          {stockTypeLabels[movement.type] ?? movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-60 truncate text-muted-foreground">
                        {movement.reason}
                      </TableCell>
                      <TableCell>{formatDate(movement.createdAt)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatQuantity(movement.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportPage>
  );
}
