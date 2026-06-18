"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboardMetrics } from "../services/get-dashboard-metrics";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: getDashboardMetrics,
  });
}
