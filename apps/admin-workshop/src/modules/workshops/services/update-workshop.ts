import { api } from "@/shared/http/api";
import { ApiRequestError } from "@/shared/http/api-error";

import { toCreateWorkshopPayload } from "./create-workshop";
import type { UpdateWorkshopPayload, Workshop, WorkshopFormValues } from "../types/workshop.types";

export function toUpdateWorkshopPayload(values: WorkshopFormValues): UpdateWorkshopPayload {
  return toCreateWorkshopPayload(values);
}

export async function updateWorkshop({
  id,
  values,
}: {
  id: string;
  values: WorkshopFormValues;
}) {
  const payload = toUpdateWorkshopPayload(values);

  try {
    const { data } = await api.patch<Workshop>(`/admin/workshops/${id}`, payload);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 405) {
      const { data } = await api.put<Workshop>(`/admin/workshops/${id}`, payload);
      return data;
    }

    throw error;
  }
}
