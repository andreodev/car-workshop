"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorkshop } from "../services/get-workshop";
import { workshopKeys } from "../services/workshop.keys";

export function useWorkshop(id: string) {
  return useQuery({
    queryKey: workshopKeys.detail(id),
    queryFn: () => getWorkshop(id),
    enabled: Boolean(id),
  });
}
