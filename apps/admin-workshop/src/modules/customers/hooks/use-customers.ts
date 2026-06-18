"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { customerKeys } from "../services/customer.keys";
import { getCustomers } from "../services/get-customers";
import type { CustomerListParams } from "../types/customer.types";

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => getCustomers(params),
    placeholderData: keepPreviousData,
  });
}
