"use client";

import type { ChangeEvent, ReactNode } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  MapPin,
  Save,
  Store,
  type LucideIcon,
} from "lucide-react";

import { fetchAddressByCep } from "@/modules/client/api/client-cep.service";
import { onlyDigits } from "@/modules/client/utils/client-input-masks";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

import {
  fetchCompanySettings,
  updateCompanySettings,
} from "../company-settings-api";
import { companySettingsFormSchema } from "../company-settings-form-schema";
import {
  emptyCompanySettingsForm,
  getCompanySettingsErrorMap,
  mapCompanySettingsToFormValues,
  type CompanySettingsFormErrors,
} from "../company-settings-form-utils";
import { maskCompanySettingsField } from "../company-settings-input-masks";
import type { CompanySettingsFormValues } from "../types";

type FieldConfig = {
  field: keyof CompanySettingsFormValues;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: "text" | "numeric" | "email" | "tel" | "url";
  maxLength?: number;
  type?: string;
  wrapperClassName?: string;
};

export function CompanySettingsForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fieldErrors, setFieldErrors] = useState<CompanySettingsFormErrors>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(false);
  const [hasEditedCep, setHasEditedCep] = useState(false);
  const [cepDigits, setCepDigits] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["company-settings"],
    queryFn: fetchCompanySettings,
  });

  const mutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: (settings) => {
      const nextValues = mapCompanySettingsToFormValues(settings);

      queryClient.setQueryData(["company-settings"], settings);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });

      form.reset(nextValues);
      setCepDigits(onlyDigits(nextValues.cep));
      setLocalError(null);
      setFieldErrors({});

      toast({
        title: "Dados da empresa salvos",
        description:
          "Essas informacoes ja podem alimentar os documentos impressos.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar os dados da empresa.";

      setLocalError(message);

      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: emptyCompanySettingsForm,
    onSubmit: async ({ value }) => {
      const validation = companySettingsFormSchema.safeParse(value);

      if (!validation.success) {
        setFieldErrors(getCompanySettingsErrorMap(validation.error.issues));
        setLocalError("Revise os campos destacados antes de salvar.");
        return;
      }

      setFieldErrors({});
      setLocalError(null);

      mutation.mutate(validation.data);
    },
  });

  useEffect(() => {
    if (hasLoadedRemoteData || settingsQuery.isLoading) {
      return;
    }

    const nextValues = mapCompanySettingsToFormValues(settingsQuery.data ?? null);

    form.reset(nextValues);
    setCepDigits(onlyDigits(nextValues.cep));
    setHasLoadedRemoteData(true);
  }, [
    form,
    hasLoadedRemoteData,
    settingsQuery.data,
    settingsQuery.isLoading,
  ]);

  const debouncedCepDigits = useDebouncedValue(cepDigits, 500);

  const cepQuery = useQuery({
    queryKey: ["viacep", debouncedCepDigits],
    queryFn: ({ signal }) => fetchAddressByCep(debouncedCepDigits, signal),
    enabled: hasEditedCep && debouncedCepDigits.length === 8,
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  useEffect(() => {
    if (!cepQuery.data) {
      return;
    }

    const address = cepQuery.data;

    form.setFieldValue("address", address.logradouro || "");
    form.setFieldValue("complement", address.complemento || "");
    form.setFieldValue("neighborhood", address.bairro || "");
    form.setFieldValue("city", address.localidade || "");
    form.setFieldValue("state", maskCompanySettingsField("state", address.uf));
    form.setFieldValue(
      "ibgeCode",
      maskCompanySettingsField("ibgeCode", address.ibge)
    );

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
  }, [cepQuery.data, form]);

  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  const isLoading = settingsQuery.isLoading && !hasLoadedRemoteData;
  const isSaving = mutation.isPending;

  function clearFieldError(field: keyof CompanySettingsFormValues) {
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

  function handleMaskedChange<K extends keyof CompanySettingsFormValues>(
    field: K,
    rawValue: CompanySettingsFormValues[K],
    setValue: (value: CompanySettingsFormValues[K]) => void
  ) {
    const nextValue = maskCompanySettingsField(field, rawValue);

    if (field === "cep") {
      setHasEditedCep(true);
      setCepDigits(onlyDigits(String(nextValue)));
    }

    setValue(nextValue);
    clearFieldError(field);
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col gap-6">
      <Header
        title="Dados da empresa"
        description="Identidade, documentos, endereco e informacoes comerciais usadas nos documentos da oficina."
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-1 flex-col gap-6"
      >
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center rounded-lg border border-border/70 bg-card">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-6">
                <FormSection
                  icon={Building2}
                  title="Identidade"
                  description="Dados que aparecem no cabecalho e identificam oficialmente a oficina."
                >
                  <div className="grid gap-4 lg:grid-cols-12">
                    <form.Field name="legalName">
                      {(field) => (
                        <InputField
                          field="legalName"
                          label="Razao social"
                          wrapperClassName="lg:col-span-7"
                          placeholder="Nome registrado da empresa"
                          required
                          value={field.state.value}
                          error={fieldErrors.legalName}
                          onChange={(event) =>
                            handleMaskedChange(
                              "legalName",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="tradeName">
                      {(field) => (
                        <InputField
                          field="tradeName"
                          label="Nome fantasia"
                          wrapperClassName="lg:col-span-5"
                          placeholder="Nome usado com clientes"
                          value={field.state.value}
                          error={fieldErrors.tradeName}
                          onChange={(event) =>
                            handleMaskedChange(
                              "tradeName",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="document">
                      {(field) => (
                        <InputField
                          field="document"
                          label="CNPJ"
                          wrapperClassName="lg:col-span-4"
                          placeholder="00.000.000/0000-00"
                          inputMode="numeric"
                          maxLength={18}
                          value={field.state.value}
                          error={fieldErrors.document}
                          onChange={(event) =>
                            handleMaskedChange(
                              "document",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="stateRegistration">
                      {(field) => (
                        <InputField
                          field="stateRegistration"
                          label="Inscricao estadual"
                          wrapperClassName="lg:col-span-4"
                          value={field.state.value}
                          error={fieldErrors.stateRegistration}
                          onChange={(event) =>
                            handleMaskedChange(
                              "stateRegistration",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="municipalRegistration">
                      {(field) => (
                        <InputField
                          field="municipalRegistration"
                          label="Inscricao municipal"
                          wrapperClassName="lg:col-span-4"
                          value={field.state.value}
                          error={fieldErrors.municipalRegistration}
                          onChange={(event) =>
                            handleMaskedChange(
                              "municipalRegistration",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>
                  </div>
                </FormSection>

                <FormSection
                  icon={MapPin}
                  title="Endereco"
                  description="Localizacao principal da oficina para contratos, OS e comprovantes."
                >
                  <div className="grid gap-4 lg:grid-cols-12">
                    <form.Field name="cep">
                      {(field) => (
                        <InputField
                          field="cep"
                          label="CEP"
                          wrapperClassName="lg:col-span-2"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="00000-000"
                          helperText={
                            cepQuery.isFetching
                              ? "Consultando ViaCEP..."
                              : cepQuery.error instanceof Error
                                ? cepQuery.error.message
                                : undefined
                          }
                          helperTone={cepQuery.error ? "error" : "muted"}
                          value={field.state.value}
                          error={fieldErrors.cep}
                          onChange={(event) =>
                            handleMaskedChange(
                              "cep",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="address">
                      {(field) => (
                        <InputField
                          field="address"
                          label="Endereco"
                          wrapperClassName="lg:col-span-6"
                          value={field.state.value}
                          error={fieldErrors.address}
                          onChange={(event) =>
                            handleMaskedChange(
                              "address",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="number">
                      {(field) => (
                        <InputField
                          field="number"
                          label="Numero"
                          wrapperClassName="lg:col-span-2"
                          value={field.state.value}
                          error={fieldErrors.number}
                          onChange={(event) =>
                            handleMaskedChange(
                              "number",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="complement">
                      {(field) => (
                        <InputField
                          field="complement"
                          label="Complemento"
                          wrapperClassName="lg:col-span-2"
                          value={field.state.value}
                          error={fieldErrors.complement}
                          onChange={(event) =>
                            handleMaskedChange(
                              "complement",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="neighborhood">
                      {(field) => (
                        <InputField
                          field="neighborhood"
                          label="Bairro"
                          wrapperClassName="lg:col-span-3"
                          value={field.state.value}
                          error={fieldErrors.neighborhood}
                          onChange={(event) =>
                            handleMaskedChange(
                              "neighborhood",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="city">
                      {(field) => (
                        <InputField
                          field="city"
                          label="Cidade"
                          wrapperClassName="lg:col-span-4"
                          value={field.state.value}
                          error={fieldErrors.city}
                          onChange={(event) =>
                            handleMaskedChange(
                              "city",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="state">
                      {(field) => (
                        <InputField
                          field="state"
                          label="Estado"
                          wrapperClassName="lg:col-span-2"
                          maxLength={2}
                          placeholder="AM"
                          value={field.state.value}
                          error={fieldErrors.state}
                          onChange={(event) =>
                            handleMaskedChange(
                              "state",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="ibgeCode">
                      {(field) => (
                        <InputField
                          field="ibgeCode"
                          label="Codigo IBGE"
                          wrapperClassName="lg:col-span-3"
                          inputMode="numeric"
                          maxLength={7}
                          value={field.state.value}
                          error={fieldErrors.ibgeCode}
                          onChange={(event) =>
                            handleMaskedChange(
                              "ibgeCode",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>
                  </div>
                </FormSection>

                <FormSection
                  icon={Store}
                  title="Contato e presenca digital"
                  description="Canais comerciais usados em cabecalhos, rodapes e contatos com clientes."
                >
                  <div className="grid gap-4 lg:grid-cols-12">
                    <form.Field name="email">
                      {(field) => (
                        <InputField
                          field="email"
                          label="E-mail"
                          wrapperClassName="lg:col-span-5"
                          inputMode="email"
                          value={field.state.value}
                          error={fieldErrors.email}
                          onChange={(event) =>
                            handleMaskedChange(
                              "email",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="phone">
                      {(field) => (
                        <InputField
                          field="phone"
                          label="Telefone"
                          wrapperClassName="lg:col-span-3"
                          inputMode="tel"
                          maxLength={15}
                          value={field.state.value}
                          error={fieldErrors.phone}
                          onChange={(event) =>
                            handleMaskedChange(
                              "phone",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="whatsapp">
                      {(field) => (
                        <InputField
                          field="whatsapp"
                          label="WhatsApp"
                          wrapperClassName="lg:col-span-4"
                          inputMode="tel"
                          maxLength={15}
                          value={field.state.value}
                          error={fieldErrors.whatsapp}
                          onChange={(event) =>
                            handleMaskedChange(
                              "whatsapp",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="website">
                      {(field) => (
                        <InputField
                          field="website"
                          label="Site"
                          wrapperClassName="lg:col-span-6"
                          inputMode="url"
                          placeholder="https://..."
                          value={field.state.value}
                          error={fieldErrors.website}
                          onChange={(event) =>
                            handleMaskedChange(
                              "website",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="logoUrl">
                      {(field) => (
                        <InputField
                          field="logoUrl"
                          label="URL do logo"
                          wrapperClassName="lg:col-span-6"
                          inputMode="url"
                          placeholder="https://..."
                          value={field.state.value}
                          error={fieldErrors.logoUrl}
                          onChange={(event) =>
                            handleMaskedChange(
                              "logoUrl",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>
                  </div>
                </FormSection>

                <FormSection
                  icon={FileText}
                  title="Informacoes para documentos"
                  description="Textos reutilizaveis no rodape e nas observacoes comerciais das impressoes."
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <form.Field name="documentFooter">
                      {(field) => (
                        <TextareaField
                          field="documentFooter"
                          label="Rodape dos documentos"
                          placeholder="Ex.: Garantia, politicas de retirada, agradecimento ou canais de suporte."
                          value={field.state.value}
                          error={fieldErrors.documentFooter}
                          onChange={(event) =>
                            handleMaskedChange(
                              "documentFooter",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>

                    <form.Field name="commercialNotes">
                      {(field) => (
                        <TextareaField
                          field="commercialNotes"
                          label="Informacoes comerciais"
                          placeholder="Ex.: Horario de funcionamento, dados bancarios ou orientacoes de pagamento."
                          value={field.state.value}
                          error={fieldErrors.commercialNotes}
                          onChange={(event) =>
                            handleMaskedChange(
                              "commercialNotes",
                              event.target.value,
                              field.handleChange
                            )
                          }
                        />
                      )}
                    </form.Field>
                  </div>
                </FormSection>
              </div>

              <form.Subscribe selector={(state) => state.values}>
                {(values) => <DocumentPreview form={values} />}
              </form.Subscribe>
            </div>

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>Erro ao salvar dados da empresa</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Estes dados serao usados como fonte central para cabecalhos, rodapes
            e identificacao da oficina nas proximas impressoes.
          </p>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading || isSaving}
            className="gap-2"
          >
            {isSaving ? <Spinner size="sm" /> : <Save className="size-4" />}
            {isSaving ? "Salvando..." : "Salvar dados"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

const FormSection = memo(function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-700 text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  );
});

const InputField = memo(function InputField({
  field,
  label,
  placeholder,
  required,
  inputMode,
  maxLength,
  type = "text",
  wrapperClassName,
  value,
  error,
  helperText,
  helperTone = "muted",
  onChange,
}: FieldConfig & {
  value: string;
  error?: string;
  helperText?: string;
  helperTone?: "muted" | "error";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Field className={wrapperClassName}>
      <FieldLabel>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>

      <FieldControl>
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
      </FieldControl>

      {error ? <FieldError>{error}</FieldError> : null}

      {!error && helperText ? (
        <FieldDescription
          className={helperTone === "error" ? "text-destructive" : undefined}
        >
          {helperText}
        </FieldDescription>
      ) : null}
    </Field>
  );
});

const TextareaField = memo(function TextareaField({
  label,
  placeholder,
  value,
  error,
  onChange,
}: Pick<FieldConfig, "field" | "label" | "placeholder"> & {
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>

      <FieldControl>
        <Textarea
          value={value}
          placeholder={placeholder}
          rows={4}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
      </FieldControl>

      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
});

const DocumentPreview = memo(function DocumentPreview({
  form,
}: {
  form: CompanySettingsFormValues;
}) {
  const title = form.tradeName || form.legalName || "Nome da oficina";

  const address = [
    form.address,
    form.number,
    form.neighborhood,
    form.city,
    form.state,
  ]
    .filter(Boolean)
    .join(", ");

  const contacts = [form.phone, form.whatsapp, form.email, form.website]
    .filter(Boolean)
    .join(" | ");

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-700 text-foreground">
            Previa documental
          </h2>
          <p className="text-sm text-muted-foreground">
            Uma leitura rapida de como a identidade sera reaproveitada.
          </p>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3 border-b border-border/70 pb-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="size-5" />
              </span>

              <div className="min-w-0">
                <p className="break-words font-heading text-base font-700 text-foreground">
                  {title}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {form.legalName || "Razao social"}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <PreviewLine label="CNPJ" value={form.document} />
              <PreviewLine label="IE" value={form.stateRegistration} />
              <PreviewLine label="Endereco" value={address} />
              <PreviewLine label="Contato" value={contacts} />
            </div>

            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              {form.documentFooter || "Rodape dos documentos"}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
});

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="break-words">
      <span className="font-medium text-foreground">{label}: </span>
      {value || "Nao informado"}
    </p>
  );
}
