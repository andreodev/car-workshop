"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteWorkshop } from "../services/delete-workshop";
import { updateWorkshopStatus } from "../services/update-workshop-status";
import { workshopKeys } from "../services/workshop.keys";
import type { TenantStatus } from "../types/workshop.types";

export function useWorkshopAdminActions(workshopId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: workshopKeys.lists() });
    queryClient.invalidateQueries({ queryKey: workshopKeys.detail(workshopId) });
  };

  const updateStatus = useMutation({
    mutationFn: (status: TenantStatus) => updateWorkshopStatus({ id: workshopId, status }),
    onSuccess: (workshop) => {
      invalidate();
      queryClient.setQueryData(workshopKeys.detail(workshopId), workshop);
      toast.success(
        workshop.status === "SUSPENDED"
          ? "Oficina bloqueada. O acesso ao tenant foi interrompido."
          : "Status da oficina atualizado."
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar status.");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteWorkshop(workshopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.lists() });
      queryClient.removeQueries({ queryKey: workshopKeys.detail(workshopId) });
      toast.success("Oficina apagada com sucesso.");
      router.push("/oficinas");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao apagar oficina.");
    },
  });

  return {
    updateStatus,
    remove,
    isPending: updateStatus.isPending || remove.isPending,
  };
}
