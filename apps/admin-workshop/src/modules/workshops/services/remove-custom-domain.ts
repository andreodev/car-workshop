import { api } from "@/shared/http/api";

import type { Workshop } from "../types/workshop.types";

export async function removeCustomDomain(workshopId: string) {
  const { data } = await api.delete<Workshop>(`/admin/workshops/${workshopId}/custom-domain`);

  return data;
}
