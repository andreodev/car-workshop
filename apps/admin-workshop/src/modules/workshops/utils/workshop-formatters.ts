import type { TenantStatus } from "../types/workshop.types";

export function formatTenantStatus(status: TenantStatus) {
  const labels: Record<TenantStatus, string> = {
    TRIAL: "Trial",
    ACTIVE: "Ativa",
    SUSPENDED: "Suspensa",
    CANCELED: "Cancelada",
  };

  return labels[status];
}

export function formatDocument(document?: string | null) {
  if (!document) return "-";

  const digits = document.replace(/\D/g, "");

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  return document;
}
