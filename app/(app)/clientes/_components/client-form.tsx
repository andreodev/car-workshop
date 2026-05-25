"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { createClient, updateClient } from "../client-api";
import { fetchAddressByCep } from "../client-cep-api";
import { clientFormSchema } from "../client-form-schema";
import { maskClientFormField, onlyDigits } from "../client-input-masks";
import {
  getClientFormErrorMap,
  mapClientToFormValues,
  type ClientFormErrors,
} from "../client-form-utils";
import type { Client, ClientFormValues } from "../types";
import { ClientFormContatoStep } from "./client-form-contato-step";
import {
  emptyClientForm,
  fieldToStepMap,
} from "./client-form-constants";
import { ClientFormDadosStep } from "./client-form-dados-step";
import { ClientFormEnderecoStep } from "./client-form-endereco-step";
import {
  ClientFormStepper,
  type ClientFormStepValue,
} from "./client-form-stepper";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type ClientFormProps = {
  mode: "create" | "edit";
  initialData?: Client | null;
};

export function ClientForm({ mode, initialData }: ClientFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormValues>(() =>
    initialData ? mapClientToFormValues(initialData) : emptyClientForm
  );
  const [activeTab, setActiveTab] = useState<ClientFormStepValue>("dados");
  const [fieldErrors, setFieldErrors] = useState<ClientFormErrors>({});
  const [hasEditedCep, setHasEditedCep] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (mode === "edit" && initialData?.id) {
        return updateClient(initialData.id, values);
      }
      return createClient(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);
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
    rawValue: ClientFormValues[K]
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

  const onChange = (field: keyof ClientFormValues) =>
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

  const stepProps = {
    form,
    fieldErrors,
    onChange,
    onSelectChange,
    getInputState,
  };

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ClientFormStepValue)}
          className="flex-1"
        >
          <div className="flex flex-1 flex-col gap-8">
            <Header
              title={mode === "edit" ? "Editar cliente" : "Cadastro de cliente"}
              description="Preencha os dados do cliente para salvar no sistema."
            />

            <div className="pb-6">
              <ClientFormStepper activeStep={activeTab} />
            </div>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-6 pt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {activeTab === "dados" ? <ClientFormDadosStep {...stepProps} /> : null}
                    {activeTab === "contato" ? <ClientFormContatoStep {...stepProps} /> : null}
                    {activeTab === "endereco" ? (
                      <ClientFormEnderecoStep
                        cepError={
                          cepQuery.error instanceof Error ? cepQuery.error.message : null
                        }
                        isCepLoading={cepQuery.isFetching}
                        {...stepProps}
                      />
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertTitle>Erro ao salvar cliente</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">
                Revise os dados antes de salvar. As informações ficam disponíveis
                para os demais módulos do sistema.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push("/clientes")}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                  {isSaving ? <Spinner size="sm" /> : null}
                  {isSaving ? "Salvando..." : "Salvar cliente"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </form>
    </section>
  );
}
