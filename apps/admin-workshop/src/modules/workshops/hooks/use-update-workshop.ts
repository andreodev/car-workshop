"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateWorkshop } from "../services/update-workshop";
import { workshopKeys } from "../services/workshop.keys";

export function useUpdateWorkshop(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkshop,
    onSuccess: (workshop) => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.lists() });
      queryClient.setQueryData(workshopKeys.detail(id), workshop);
      toast.success("Oficina atualizada com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar oficina.");
    },
  });
}
