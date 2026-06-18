import { api } from "@/shared/http/api";

import type {
  WorkshopListParams,
  WorkshopListResponse,
} from "../types/workshop.types";

export async function getWorkshops(params: WorkshopListParams = {}) {
  const { data } = await api.get<WorkshopListResponse>("/admin/workshops", {
    params,
  });

  return data;
}
