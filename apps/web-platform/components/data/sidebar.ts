import {
  ClipboardList,
  Landmark,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  Users,
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
      { title: "Clientes", href: "/clientes", icon: Users },
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
