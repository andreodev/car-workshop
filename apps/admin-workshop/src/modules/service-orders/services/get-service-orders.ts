import { api } from "@/shared/http/api";
import type { PaginatedResponse } from "@/shared/types/paginated-response";

import type { ServiceOrder } from "../types/service-order.types";

export async function getServiceOrders() {
  const { data } =
    await api.get<PaginatedResponse<ServiceOrder>>("/service-orders");

  return data;
}
