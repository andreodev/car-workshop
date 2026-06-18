"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getWorkshops } from "../services/get-workshops";
import { workshopKeys } from "../services/workshop.keys";
import type { WorkshopListParams } from "../types/workshop.types";

export function useWorkshops(params: WorkshopListParams = {}) {
  return useQuery({
    queryKey: workshopKeys.list(params),
    queryFn: () => getWorkshops(params),
    placeholderData: keepPreviousData,
  });
}
