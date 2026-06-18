"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createCustomer } from "../services/create-customer";
import { customerKeys } from "../services/customer.keys";

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      toast.success("Cliente cadastrado com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar cliente.");
    },
  });
}
