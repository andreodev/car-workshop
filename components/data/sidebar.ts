import {
  Car,
  FileText,
  Grid2X2,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";

export const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Veículos", href: "/veiculos", icon: Car },
  { title: "Ordens de Serviço", href: "/ordens-servico", icon: Wrench },
  { title: "Orçamentos", href: "/orcamentos", icon: FileText },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Setores", href: "/setores", icon: Grid2X2 },
  { title: "PDV", href: "/pdv", icon: ShoppingCart },
  { title: "Configuracoes", href: "/configuracoes", icon: Settings },
];
