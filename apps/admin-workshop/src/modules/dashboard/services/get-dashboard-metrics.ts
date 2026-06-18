import { api } from "@/shared/http/api";

import type { DashboardMetric } from "../types/dashboard.types";

const fallbackMetrics: DashboardMetric[] = [
  {
    label: "Clientes",
    value: "0",
    helper: "Aguardando integracao com /dashboard/metrics",
  },
  {
    label: "Veiculos",
    value: "0",
    helper: "Base pronta para modulo de frota",
  },
  {
    label: "Ordens abertas",
    value: "0",
    helper: "Service orders isolado em modulo proprio",
  },
];

export async function getDashboardMetrics() {
  try {
    const { data } = await api.get<DashboardMetric[]>("/dashboard/metrics");
    return data;
  } catch {
    return fallbackMetrics;
  }
}
