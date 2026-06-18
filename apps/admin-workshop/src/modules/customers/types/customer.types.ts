import { z } from "zod";

import type { PaginatedResponse } from "@/shared/types/paginated-response";

export const customerSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export type Customer = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type CustomerListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CustomerListResponse = PaginatedResponse<Customer>;
