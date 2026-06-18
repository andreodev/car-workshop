import { api } from "@/shared/http/api";

import type {
  CustomerListParams,
  CustomerListResponse,
} from "../types/customer.types";

export async function getCustomers(params: CustomerListParams = {}) {
  const { data } = await api.get<CustomerListResponse>("/customers", {
    params,
  });

  return data;
}
