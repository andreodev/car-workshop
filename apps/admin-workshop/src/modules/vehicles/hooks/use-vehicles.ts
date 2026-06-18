"use client";

import { useQuery } from "@tanstack/react-query";

import { getVehicles } from "../services/get-vehicles";

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles", "list"],
    queryFn: getVehicles,
  });
}
