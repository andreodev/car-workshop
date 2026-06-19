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
  } catch (postError) {
    if (!isRouteUnavailable(postError)) {
      throw postError;
    }
  }

  try {
    const { data } = await api.put<Workshop>(`/admin/workshops/${id}`, payload);
    return data;
  } catch (putError) {
    if (!isRouteUnavailable(putError)) {
      throw putError;
    }
  }

  try {
    const { data } = await api.patch<Workshop>(`/admin/workshops/${id}`, payload);
    return data;
  } catch (patchError) {
    if (!isRouteUnavailable(patchError)) {
      throw patchError;
    }
  }

  throw new ApiRequestError(
    "A API de produção ainda não foi atualizada com a rota de edição de oficinas. Publique a API Go antes de salvar as cores.",
    { status: 404, code: "workshop_update_route_missing" }
  );
}

function isRouteUnavailable(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 404 || error.status === 405);
}
