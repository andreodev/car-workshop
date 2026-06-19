import { api } from "@/shared/http/api";

export async function deleteWorkshop(id: string) {
  await api.post(`/admin/workshops/${id}/delete`);
}
