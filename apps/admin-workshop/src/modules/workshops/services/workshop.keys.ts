import type { WorkshopListParams } from "../types/workshop.types";

export const workshopKeys = {
  all: ["workshops"] as const,
  lists: () => [...workshopKeys.all, "list"] as const,
  list: (params: WorkshopListParams) => [...workshopKeys.lists(), params] as const,
  details: () => [...workshopKeys.all, "detail"] as const,
  detail: (id: string) => [...workshopKeys.details(), id] as const,
};
