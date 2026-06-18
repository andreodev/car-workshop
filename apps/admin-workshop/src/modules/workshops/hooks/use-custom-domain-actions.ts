"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { removeCustomDomain } from "../services/remove-custom-domain";
import { updateCustomDomain } from "../services/update-custom-domain";
import { verifyCustomDomain } from "../services/verify-custom-domain";
import { workshopKeys } from "../services/workshop.keys";

export function useCustomDomainActions(workshopId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: workshopKeys.lists() });
    queryClient.invalidateQueries({ queryKey: workshopKeys.detail(workshopId) });
  };

  const update = useMutation({
    mutationFn: (customDomain: string) => updateCustomDomain(workshopId, customDomain),
    onSuccess: () => {
      invalidate();
      toast.success("Dominio enviado para verificacao.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar dominio.");
    },
  });

  const verify = useMutation({
    mutationFn: () => verifyCustomDomain(workshopId),
    onSuccess: (result) => {
      invalidate();
      if (result.workshop.customDomainStatus === "VERIFIED") {
        toast.success("Dominio verificado com sucesso.");
        return;
      }
      toast.warning(result.workshop.customDomainLastError ?? "DNS ainda nao verificado.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao verificar dominio.");
    },
  });

  const remove = useMutation({
    mutationFn: () => removeCustomDomain(workshopId),
    onSuccess: () => {
      invalidate();
      toast.success("Dominio personalizado removido.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao remover dominio.");
    },
  });

  return {
    update,
    verify,
    remove,
    isPending: update.isPending || verify.isPending || remove.isPending,
  };
}
