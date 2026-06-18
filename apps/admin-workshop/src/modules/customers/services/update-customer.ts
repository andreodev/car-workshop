import { api } from "@/shared/http/api";

import type { Customer, CustomerFormValues } from "../types/customer.types";

export async function updateCustomer(id: string, payload: CustomerFormValues) {
  const { data } = await api.put<Customer>(`/customers/${id}`, payload);

  return data;
}
