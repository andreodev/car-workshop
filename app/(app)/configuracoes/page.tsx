import Link from "next/link";
import {
  Banknote,
  Building2,
  Car,
  CheckSquare,
  ClipboardList,
  FileText,
  Globe2,
  Languages,
  LineChart,
  LockKeyhole,
  Mail,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import Header from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const settingGroups = [
  {
    title: "Bases operacionais",
    description: "Cadastros que alimentam as rotinas da oficina.",
    items: [
      {
        title: "Clientes",
        description: "Dados fiscais, contatos e endereços usados em vendas, OS e orçamentos.",
        href: "/clientes",
        status: "Ativo",
        icon: Users,
      },
      {
        title: "Veículos",
        description: "Frota atendida, placa, modelo e histórico vinculado ao cliente.",
        href: "/veiculos",
        status: "Ativo",
        icon: Car,
      },
      {
        title: "Mecânicos",
        description: "Equipe responsável por serviços, orçamentos e relatórios de produtividade.",
        href: "/mecanicos",
        status: "Ativo",
        icon: UserCog,
      },
      {
        title: "Fornecedores",
        description: "Parceiros de compra, contatos, linhas de produto e pedidos.",
        href: "/fornecedores",
        status: "Ativo",
        icon: Truck,
      },
      {
        title: "Produtos e serviços",
        description: "Catálogo, preços, estoque e dados fiscais usados no caixa e OS.",
        href: "/produtos",
        status: "Ativo",
        icon: Package,
      },
      {
        title: "Setores",
        description: "Organização do movimento por balcão, peças, oficina ou área interna.",
        href: "/setores",
        status: "Ativo",
        icon: Building2,
      },
    ],
  },
  {
    title: "Rotinas e regras",
    description: "Pontos que definem como a operação acontece no dia a dia.",
    items: [
      {
        title: "Ordens de serviço",
        description: "Fluxo de atendimento, vistoria, execução e fechamento.",
        href: "/ordens-servico",
        status: "Ativo",
        icon: Wrench,
      },
      {
        title: "Orçamentos",
        description: "Propostas, aprovação e conversão em ordem de serviço.",
        href: "/orcamentos",
        status: "Ativo",
        icon: FileText,
      },
      {
        title: "Pedidos",
        description: "Compras de fornecedores, previsão, nota fiscal e recebimento.",
        href: "/pedidos",
        status: "Ativo",
        icon: ClipboardList,
      },
      {
        title: "Caixa",
        description: "Venda balcão, formas de pagamento e consulta do movimento.",
        href: "/pdv",
        status: "Ativo",
        icon: ShoppingCart,
      },
      {
        title: "Checklists",
        description: "Modelos de inspeção e conferência para padronizar atendimentos.",
        href: null,
        status: "Planejado",
        icon: CheckSquare,
      },
      {
        title: "Categorias e situações",
        description: "Classificações operacionais para organizar filtros, listas e relatórios.",
        href: null,
        status: "Planejado",
        icon: Tags,
      },
    ],
  },
  {
    title: "Gestão e governança",
    description: "Controles que dão segurança, contexto e direção ao sistema.",
    items: [
      {
        title: "Financeiro",
        description: "Contas, categorias, lançamentos e visão de caixa.",
        href: "/financeiro",
        status: "Ativo",
        icon: Banknote,
      },
      {
        title: "Relatórios",
        description: "Leituras de vendas, estoque, clientes e financeiro.",
        href: "/relatorios",
        status: "Ativo",
        icon: LineChart,
      },
      {
        title: "Dados da empresa",
        description: "Identidade, documentos, endereço e informações comerciais da oficina.",
        href: "/configuracoes/dados-empresa",
        status: "Ativo",
        icon: Settings,
      },
      {
        title: "Permissões",
        description: "Papéis de acesso para proteger rotinas sensíveis.",
        href: null,
        status: "Planejado",
        icon: LockKeyhole,
      },
      {
        title: "Modelos de mensagem",
        description: "Textos reutilizáveis para clientes, aprovações e acompanhamento.",
        href: null,
        status: "Planejado",
        icon: Mail,
      },
      {
        title: "Site e idioma",
        description: "Preferências públicas, linguagem e presença digital.",
        href: null,
        status: "Planejado",
        icon: Globe2,
      },
    ],
  },
];

const principles = [
  {
    title: "Operação consistente",
    description: "Cada cadastro ativo aqui sustenta vendas, serviços, compras e relatórios.",
    icon: SlidersHorizontal,
  },
  {
    title: "Dados confiáveis",
    description: "Ajustes de base evitam retrabalho e deixam o histórico da oficina mais limpo.",
    icon: ShieldCheck,
  },
  {
    title: "Crescimento controlado",
    description: "Itens planejados indicam onde novas regras do negócio devem nascer.",
    icon: ReceiptText,
  },
];

function getBadgeVariant(status: string) {
  return status === "Ativo" ? "default" : "secondary";
}

function getCounts() {
  const items = settingGroups.flatMap((group) => group.items);
  return {
    total: items.length,
    active: items.filter((item) => item.status === "Ativo").length,
    planned: items.filter((item) => item.status !== "Ativo").length,
  };
}

export default function SettingsPage() {
  const counts = getCounts();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title="Configurações"
          description="Centro de controle para manter a oficina organizada, previsível e pronta para crescer."
        />

        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="h-8 px-3">
            {counts.active} ativos
          </Badge>
          <Badge variant="secondary" className="h-8 px-3">
            {counts.planned} planejados
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {principles.map((principle) => {
          const Icon = principle.icon;

          return (
            <Card key={principle.title} className="border-border/70 shadow-sm">
              <CardContent className="flex gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-heading text-sm font-700 text-foreground">
                    {principle.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{principle.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6">
        {settingGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-base font-700 uppercase tracking-wide text-foreground">
                {group.title}
              </h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <Badge variant={getBadgeVariant(item.status)} className="shrink-0">
                        {item.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading text-sm font-700 text-foreground">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </>
                );

                if (!item.href) {
                  return (
                    <Card key={item.title} className="border-dashed border-border/80 bg-muted/20">
                      <CardContent className="space-y-4 p-4">{content}</CardContent>
                    </Card>
                  );
                }

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <Card className="h-full border-border/70 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <CardContent className="space-y-4 p-4">{content}</CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Languages className="size-4" />
          </span>
          <p>
            A tela de configurações passa a ser o mapa das decisões estruturais da oficina:
            o que já está operando, o que ainda será parametrizado e onde cada ajuste impacta o
            restante do sistema.
          </p>
        </div>
      </div>
    </section>
  );
}
