import {
  Car,
  FileText,
  Grid2X2,
  Landmark,
  LayoutDashboard,
  LineChart,
  Package,
  ClipboardList,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export const menuGroups = [
  {
    title: "Geral",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Cadastros",
    items: [
      { title: "Clientes", href: "/clientes", icon: Users },
      { title: "Veículos", href: "/veiculos", icon: Car },
      { title: "Mecânicos", href: "/mecanicos", icon: UserCog },
      { title: "Fornecedores", href: "/fornecedores", icon: Truck },
      { title: "Produtos", href: "/produtos", icon: Package },
      { title: "Setores", href: "/setores", icon: Grid2X2 },
    ],
  },
  {
    title: "Operações",
    items: [
      { title: "Ordens de Serviço", href: "/ordens-servico", icon: Wrench },
      { title: "Orçamentos", href: "/orcamentos", icon: FileText },
      { title: "Pedidos", href: "/pedidos", icon: ClipboardList },
      { title: "PDV", href: "/pdv", icon: ShoppingCart },
    ],
  },
  {
    title: "Financeiro",
    items: [{ title: "Financeiro", href: "/financeiro", icon: Landmark }],
  },
  {
    title: "Relatórios",
    items: [{ title: "Relatórios", href: "/relatorios", icon: LineChart }],
  },
  {
    title: "Configurações",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
      { title: "Dados da empresa", href: "/configuracoes/dados-empresa", icon: Settings },
    ],
  },
];
