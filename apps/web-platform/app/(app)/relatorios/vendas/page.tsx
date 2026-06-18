import { ClipboardList, Package, ReceiptText, Wrench } from "lucide-react";

import { ReportMetric, ReportPage } from "../_components/report-page";
import {
  formatCurrency,
  formatDate,
  formatInteger,
  formatQuantity,
  getSalesReportData,
} from "@/app/lib/reports";
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

export default async function SalesReportPage() {
  const data = await getSalesReportData();

  return (
    <ReportPage
      title="Relatorio de vendas"
      description="OS finalizadas, PDV, pecas, servicos e movimentos recentes."
      exportType="sales"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          label="Ordens de servico"
          value={formatCurrency(data.cards.serviceOrdersTotal)}
          detail={`${formatInteger(data.cards.serviceOrdersCount)} finalizadas no mes`}
          icon={Wrench}
        />
        <ReportMetric
          label="PDV"
          value={formatCurrency(data.cards.pdvTotal)}
          detail={`${formatInteger(data.cards.pdvCount)} vendas concluidas`}
          icon={ReceiptText}
        />
        <ReportMetric
          label="Pecas e produtos"
          value={formatCurrency(data.cards.productsTotal)}
          detail={`${formatQuantity(data.cards.productsQuantity)} itens vendidos`}
          icon={Package}
        />
        <ReportMetric
          label="Servicos"
          value={formatCurrency(data.cards.servicesTotal)}
          detail={`${formatQuantity(data.cards.servicesQuantity)} itens vendidos`}
          icon={ClipboardList}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Movimentos recentes</CardTitle>
          <CardDescription>Ultimas vendas e ordens finalizadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead>Origem</TableHead>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Detalhe</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>#{item.code}</TableCell>
                    <TableCell className="max-w-56 truncate">{item.customer}</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {item.detail || "-"}
                    </TableCell>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </ReportPage>
  );
}
