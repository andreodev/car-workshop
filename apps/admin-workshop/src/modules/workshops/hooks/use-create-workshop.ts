"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createWorkshop } from "../services/create-workshop";
import { workshopKeys } from "../services/workshop.keys";

export function useCreateWorkshop() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createWorkshop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.lists() });
      toast.success("Oficina criada com sucesso.");
      router.push("/oficinas");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar oficina.");
    },
  });
}
