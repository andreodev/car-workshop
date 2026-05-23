import {
  Home,
  Users,
  Car,
  ClipboardList,
  FileText,
  Wallet,
  Settings,
} from "lucide-react";

export const menuItems = [
  { title: "Início", href: "/dashboard", icon: Home },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Veículos", href: "/veiculos", icon: Car },
  { title: "Ordem de serviço", href: "/ordens-servico", icon: ClipboardList },
  { title: "Orçamentos", href: "/orçamentos", icon: FileText },
  { title: "Financeiro", href: "/financeiro", icon: Wallet },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
