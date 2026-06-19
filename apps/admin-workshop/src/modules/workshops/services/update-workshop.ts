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
    const { data } = await api.post<Workshop>(`/admin/workshops/${id}/update`, payload);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      throw new ApiRequestError(
        "A API de produção ainda não foi atualizada. Publique a API Go antes de salvar a oficina.",
        { status: 404, code: "workshop_update_route_missing" }
      );
    }

    throw error;
  }
}
