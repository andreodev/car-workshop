import { api } from "@/shared/http/api";

import type { CustomDomainResult } from "../types/workshop.types";

export async function updateCustomDomain(workshopId: string, customDomain: string) {
  const { data } = await api.patch<CustomDomainResult>(
    `/admin/workshops/${workshopId}/custom-domain`,
    { customDomain }
  );

  return data;
}
