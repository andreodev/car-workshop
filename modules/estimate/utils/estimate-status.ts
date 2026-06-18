import type { ComponentProps } from "react";

import type { EstimateStatus } from "../types/estimate.types";
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export const estimateStatusOptions: Array<{
  value: EstimateStatus;
  label: string;
  variant: BadgeVariant;
  className?: string;
}> = [
  { value: "RASCUNHO", label: "Rascunho", variant: "outline" },
  { value: "ENVIADO", label: "Enviado", variant: "secondary" },
  {
    value: "APROVADO",
    label: "Aprovado",
    variant: "default",
    className: "bg-emerald-600 text-white",
  },
  { value: "REJEITADO", label: "Rejeitado", variant: "destructive" },
  {
    value: "CONVERTIDO",
    label: "OS Convertida",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800",
  },
  { value: "CANCELADO", label: "Cancelado", variant: "outline" },
];

export function getEstimateStatusOption(status: EstimateStatus) {
  return (
    estimateStatusOptions.find((option) => option.value === status) ??
    estimateStatusOptions[0]
  );
}
