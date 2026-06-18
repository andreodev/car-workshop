import { api } from "@/shared/http/api";

import type { CustomDomainResult } from "../types/workshop.types";

export async function verifyCustomDomain(workshopId: string) {
  const { data } = await api.post<CustomDomainResult>(
    `/admin/workshops/${workshopId}/custom-domain/verify`
  );

  return data;
}
