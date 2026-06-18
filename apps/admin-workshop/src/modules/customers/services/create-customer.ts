import { api } from "@/shared/http/api";

import type { Customer, CustomerFormValues } from "../types/customer.types";

export async function createCustomer(payload: CustomerFormValues) {
  const { data } = await api.post<Customer>("/customers", payload);

  return data;
}
