import type { ComponentProps } from "react";

import type { ServiceOrderStatus } from "./types";
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export const serviceOrderStatusOptions: Array<{
  value: ServiceOrderStatus;
  label: string;
  variant: BadgeVariant;
  className?: string;
}> = [
  { value: "ABERTA", label: "Aberta", variant: "outline" },
  { value: "EM_ANDAMENTO", label: "Em andamento", variant: "secondary" },
  {
    value: "AGUARDANDO_PECAS",
    label: "Aguardando pecas",
    variant: "destructive",
    className: "border-amber-300 bg-amber-100 text-amber-800",
  },
  { value: "IMPEDIDA", label: "Impedida", variant: "destructive" },
  { value: "FINALIZADA", label: "Concluida", variant: "default" },
  { value: "CANCELADA", label: "Cancelada", variant: "outline" },
];

export function getServiceOrderStatusOption(status: ServiceOrderStatus) {
  return (
    serviceOrderStatusOptions.find((option) => option.value === status) ??
    serviceOrderStatusOptions[0]
  );
}
