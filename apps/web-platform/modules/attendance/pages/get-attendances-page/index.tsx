import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  FileText,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const primaryActions = [
  {
    title: "Criar orçamento",
    description:
      "Use quando o cliente ainda precisa aprovar valores, peças ou serviços.",
    href: "/orcamentos/novo",
    icon: FileText,
    button: "Novo orçamento",
  },
  {
    title: "Abrir ordem de serviço",
    description:
      "Use quando o veículo já entrou na oficina e o serviço será executado.",
    href: "/ordens-servico/novo",
    icon: Wrench,
    button: "Nova OS",
  },
  {
    title: "Venda rápida no caixa",
    description:
      "Use para venda de balcão ou recebimento direto sem abrir uma OS nova.",
    href: "/pdv",
    icon: ShoppingCart,
    button: "Abrir caixa",
  },
];

const followUpActions = [
  {
    title: "Orçamentos",
    description: "Acompanhe propostas, envie para o cliente e converta em OS.",
    href: "/orcamentos",
    icon: FileText,
  },
  {
    title: "Ordens de serviço",
    description: "Veja a fila de execução, status e detalhes dos serviços.",
    href: "/ordens-servico",
    icon: ClipboardList,
  },
  {
    title: "Vendas e recebimentos",
    description: "Consulte vendas do PDV e pagamentos de OS finalizadas.",
    href: "/pdv/vendas",
    icon: Banknote,
  },
];

export function GetAttendancesPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Atendimentos"
          description="Uma entrada simples para orçamento, ordem de serviço e venda rápida."
        />

        <Button asChild className="gap-2">
          <Link href="/orcamentos/novo">
            Começar agora
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <Card className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_45%)] shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3 lg:p-5">
          {primaryActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className="group flex min-h-52 flex-col justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/45 hover:bg-accent/35"
            >
              <span>
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="size-5" />
                </span>
                <span className="mt-4 flex items-center gap-2 text-xs font-800 uppercase tracking-wide text-muted-foreground">
                  Passo {index + 1}
                </span>
                <strong className="mt-2 block text-lg font-800 text-foreground">
                  {action.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <span className="mt-4 flex items-center justify-between text-sm font-semibold text-primary">
                {action.button}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Qual caminho usar?</CardTitle>
            <CardDescription>
              A operação continua igual por baixo, mas a escolha fica mais
              direta para quem está no balcão.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              ["Orçamento", "Cliente perguntou preço ou precisa aprovar."],
              ["OS", "Serviço confirmado, veículo ou item já entrou."],
              ["Caixa", "Venda direta ou recebimento de serviço finalizado."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-background p-3"
              >
                <strong className="text-sm">{title}</strong>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Acompanhar atendimentos</CardTitle>
            <CardDescription>
              Listas completas para continuar o que já foi iniciado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {followUpActions.map((action) => (
              <Button
                key={action.title}
                asChild
                variant="outline"
                className="h-auto justify-between gap-3 rounded-lg p-3 text-left"
              >
                <Link href={action.href}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <action.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{action.title}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
