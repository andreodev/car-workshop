import { api } from "@/shared/http/api";
import type { PaginatedResponse } from "@/shared/types/paginated-response";

import type { Vehicle } from "../types/vehicle.types";

export async function getVehicles() {
  const { data } = await api.get<PaginatedResponse<Vehicle>>("/vehicles");

  return data;
}
