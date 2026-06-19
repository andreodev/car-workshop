import { api } from "@/shared/http/api";
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
  const { data } = await api.post<Workshop>(`/admin/workshops/${id}/update`, payload);

  return data;
}
