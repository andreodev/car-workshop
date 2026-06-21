import type { EstimateStatus, ServiceOrderStatus } from "@prisma/client";
import { Banknote, PlusCircle, ShoppingCart, Users } from "lucide-react";

export const dashboardPeriodOptions = [
  { value: "yesterday", label: "Ontem" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
] as const;

export const activeServiceOrderStatuses: ServiceOrderStatus[] = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
];

export const openEstimateStatuses: EstimateStatus[] = [
  "RASCUNHO",
  "ENVIADO",
  "APROVADO",
];

export const quickActions = [
  {
    title: "Novo atendimento",
    href: "/atendimentos",
    icon: PlusCircle,
    variant: "default" as const,
  },
  {
    title: "Venda rápida",
    href: "/pdv",
    icon: ShoppingCart,
    variant: "secondary" as const,
  },
  {
    title: "Cadastrar cliente",
    href: "/clientes/novo",
    icon: Users,
    variant: "outline" as const,
  },
  {
    title: "Ver financeiro",
    href: "/financeiro",
    icon: Banknote,
    variant: "outline" as const,
  },
];

export const stepByStep = [
  ["1", "Orçar", "Monte a proposta quando o cliente ainda vai aprovar."],
  ["2", "Executar", "Abra a OS quando o serviço já está na oficina."],
  ["3", "Receber", "Finalize no caixa e acompanhe no financeiro."],
];
