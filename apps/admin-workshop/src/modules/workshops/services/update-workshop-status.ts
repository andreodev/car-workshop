import { api } from "@/shared/http/api";

import type { TenantStatus, Workshop } from "../types/workshop.types";

export async function updateWorkshopStatus({
  id,
  status,
}: {
  id: string;
  status: TenantStatus;
}) {
  const { data } = await api.post<Workshop>(`/admin/workshops/${id}/status`, {
    status,
  });

  return data;
}
