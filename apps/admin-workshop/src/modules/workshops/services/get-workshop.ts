import { api } from "@/shared/http/api";

import type { Workshop } from "../types/workshop.types";

export async function getWorkshop(id: string) {
  const { data } = await api.get<Workshop>(`/admin/workshops/${id}`);

  return data;
}
