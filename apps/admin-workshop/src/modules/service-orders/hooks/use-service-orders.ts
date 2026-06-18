"use client";

import { useQuery } from "@tanstack/react-query";

import { getServiceOrders } from "../services/get-service-orders";

export function useServiceOrders() {
  return useQuery({
    queryKey: ["service-orders", "list"],
    queryFn: getServiceOrders,
  });
}
