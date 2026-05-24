import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive02Icon,
  BankIcon,
  Building03Icon,
  Car03Icon,
  CreditCardIcon,
  Flag03Icon,
  Globe02Icon,
  LanguageSquareIcon,
  ListViewIcon,
  Location04Icon,
  LockKeyIcon,
  MailSetting01Icon,
  Package02Icon,
  QuestionIcon,
  Rocket02Icon,
  Settings03Icon,
  Task01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";

const settingsItems = [
  {
    title: "Modulos e Extensoes",
    icon: Rocket02Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Colaboradores",
    icon: Wrench01Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Permissoes",
    icon: LockKeyIcon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Dados empresa",
    icon: Settings03Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Modelos de mensagens",
    icon: MailSetting01Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Inventario",
    icon: Archive02Icon,
    href: "/produtos",
    status: "Ativo",
  },
  {
    title: "Setores",
    icon: Building03Icon,
    href: "/setores",
    status: "Ativo",
  },
  {
    title: "Categoria",
    icon: ListViewIcon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Situação",
    icon: Flag03Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Contas",
    icon: BankIcon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Forma de pagamento",
    icon: CreditCardIcon,
    href: "/pdv",
    status: "Ativo",
  },
  {
    title: "Localização",
    icon: Location04Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Departamento",
    icon: Package02Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Checklist",
    icon: Task01Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Questionario",
    icon: QuestionIcon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Veículo",
    icon: Car03Icon,
    href: "/veiculos",
    status: "Ativo",
  },
  {
    title: "Site",
    icon: Globe02Icon,
    href: "#",
    status: "Prototipo",
  },
  {
    title: "Linguagem",
    icon: LanguageSquareIcon,
    href: "#",
    status: "Novo",
  },
];

function getBadgeVariant(status: string) {
  if (status === "Novo") {
    return "destructive";
  }

  return status === "Ativo" ? "default" : "secondary";
}

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header className="rounded-md border bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Oficina Integrada
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">Configuracoes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Base operacional do prototipo.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {settingsItems.length} areas
          </Badge>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => {
          const content = (
            <>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={item.icon} strokeWidth={2.1} className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {item.title}
              </span>
              <Badge variant={getBadgeVariant(item.status)} className="shrink-0">
                {item.status}
              </Badge>
            </>
          );

          if (item.href === "#") {
            return (
              <div
                key={item.title}
                className="flex min-h-16 items-center gap-3 rounded-md border bg-white px-4 py-3 shadow-sm"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.title}
              href={item.href}
              className="flex min-h-16 items-center gap-3 rounded-md border bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {content}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
