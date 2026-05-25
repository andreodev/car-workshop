import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ReceiptText,
  Users,
} from "lucide-react";

import Header from "@/components/ui/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const reports = [
  {
    title: "Vendas",
    description: "OS finalizadas, PDV, pecas, servicos e movimentos recentes.",
    href: "/relatorios/vendas",
    icon: ReceiptText,
  },
  {
    title: "Financeiro",
    description: "Contas, fluxo de caixa, receitas, despesas e resultado do mes.",
    href: "/relatorios/financeiro",
    icon: CircleDollarSign,
  },
  {
    title: "Estoque",
    description: "Produtos abaixo do minimo e entradas/saidas no periodo.",
    href: "/relatorios/estoque",
    icon: Boxes,
  },
  {
    title: "Clientes",
    description: "Maiores compradores, clientes inativos e recorrencia.",
    href: "/relatorios/clientes",
    icon: Users,
  },
];

export default function ReportsPage() {
  return (
    <section className="grid gap-6">
      <Header
        title="Relatorios"
        description="Escolha um relatorio para analisar e exportar os dados."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="group">
            <Card className="h-full shadow-sm transition-colors group-hover:border-primary/50 group-hover:bg-card/80">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <report.icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-medium text-primary">Abrir relatorio</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
