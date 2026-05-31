import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { clientsKeys } from "../api/client.keys";
import { clientsService } from "../api/client.service";
import { fetchAddressByCep } from "../api/client-cep.service";
import { emptyClientForm, fieldToStepMap } from "../components/client-form-constants";
import type { ClientFormStepValue } from "../components/client-form-stepper";
import { clientFormSchema } from "../utils/client-form-schema";
import { maskClientFormField, onlyDigits } from "../utils/client-input-masks";
import {
  getClientFormErrorMap,
  mapClientToFormValues,
  type ClientFormErrors,
} from "../utils/client-form-utils";
import type { Client, ClientFormValues } from "../types/client.types";

type UseClientFormParams = {
  mode: "create" | "edit";
  initialData?: Client | null;
};

export function useClientForm({ mode, initialData }: UseClientFormParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<ClientFormValues>(() =>
    initialData ? mapClientToFormValues(initialData) : emptyClientForm,
  );
  const [activeTab, setActiveTab] = useState<ClientFormStepValue>("dados");
  const [fieldErrors, setFieldErrors] = useState<ClientFormErrors>({});
  const [hasEditedCep, setHasEditedCep] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (mode === "edit" && initialData?.id) {
        return clientsService.update(initialData.id, values);
      }

      return clientsService.create(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all });

      toast({
        title: mode === "edit" ? "Cliente atualizado" : "Cliente cadastrado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });

      router.push("/clientes");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar o cliente.";

      setLocalError(message);

      toast({
        title: "Erro ao salvar cliente",
        description: message,
        variant: "destructive",
      });
    },
  });

  const invalidFieldSet = useMemo(() => new Set(Object.keys(fieldErrors)), [fieldErrors]);
  const cepDigits = useMemo(() => onlyDigits(form.cep), [form.cep]);

  const cepQuery = useQuery({
    queryKey: ["viacep", cepDigits],
    queryFn: ({ signal }) => fetchAddressByCep(cepDigits, signal),
    enabled: hasEditedCep && cepDigits.length === 8,
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  const applyCepAddress = useEffectEvent((address: NonNullable<typeof cepQuery.data>) => {
    setForm((prev) => ({
      ...prev,
      address: address.logradouro || prev.address,
      complement: prev.complement || address.complemento || "",
      neighborhood: address.bairro || prev.neighborhood,
      city: address.localidade || prev.city,
      state: maskClientFormField("state", address.uf),
      ibgeCode: maskClientFormField("ibgeCode", address.ibge),
    }));
    setFieldErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors.cep;
      delete nextErrors.address;
      delete nextErrors.neighborhood;
      delete nextErrors.city;
      delete nextErrors.state;
      delete nextErrors.ibgeCode;
      return nextErrors;
    });
  });

  useEffect(() => {
    if (!cepQuery.data) {
      return;
    }

    const address = cepQuery.data;
    queueMicrotask(() => applyCepAddress(address));
  }, [cepQuery.data]);

  function updateField<K extends keyof ClientFormValues>(
    field: K,
    rawValue: ClientFormValues[K],
  ) {
    const nextValue = maskClientFormField(field, rawValue);

    if (field === "cep") {
      setHasEditedCep(true);
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
    setLocalError(null);
  }

  const onChange =
    (field: keyof ClientFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value);
    };

  function onSelectChange(field: keyof ClientFormValues, value: string) {
    updateField(field, value as ClientFormValues[typeof field]);
  }

  function validateForm(values: ClientFormValues) {
    const result = clientFormSchema.safeParse(values);

    if (result.success) {
      setFieldErrors({});
      setLocalError(null);
      return { success: true as const, data: result.data };
    }

    const nextErrors = getClientFormErrorMap(result.error.issues);
    setFieldErrors(nextErrors);
    setLocalError("Revise os campos destacados antes de salvar.");

    const firstField = Object.keys(nextErrors)[0] as keyof ClientFormValues | undefined;
    if (firstField) {
      setActiveTab(fieldToStepMap[firstField]);
    }

    return { success: false as const };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateForm(form);
    if (!validation.success) {
      return;
    }

    mutation.mutate(validation.data);
  }

  function getInputState(field: keyof ClientFormValues) {
    return {
      "aria-invalid": invalidFieldSet.has(field),
    };
  }

  function handleCancel() {
    router.push("/clientes");
  }

  return {
    form,
    activeTab,
    fieldErrors,
    isSaving: mutation.isPending,
    errorMessage:
      localError ?? (mutation.error instanceof Error ? mutation.error.message : null),
    cepError: cepQuery.error instanceof Error ? cepQuery.error.message : null,
    isCepLoading: cepQuery.isFetching,
    setActiveTab,
    onChange,
    onSelectChange,
    getInputState,
    handleSubmit,
    handleCancel,
  };
}
