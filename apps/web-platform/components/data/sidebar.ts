import {
  ClipboardCheck,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

export const menuGroups = [
  {
    title: "Principal",
    items: [
      { title: "Início", href: "/", icon: LayoutDashboard },
      { title: "Atendimentos", href: "/atendimentos", icon: ClipboardList },
    ],
  },
  {
    title: "Dia a dia",
    items: [
      { title: "Ordens de Serviço", href: "/ordens-servico", icon: ClipboardCheck },
      { title: "Clientes", href: "/clientes", icon: Users },
      { title: "Mecânicos", href: "/mecanicos", icon: Wrench },
      { title: "Estoque", href: "/produtos", icon: Package },
      { title: "Financeiro", href: "/financeiro", icon: Landmark },
      { title: "Relatórios", href: "/relatorios", icon: LineChart },
    ],
  },
  {
    title: "Sistema",
    items: [{ title: "Configurações", href: "/configuracoes", icon: Settings }],
  },
];
