"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Mail, Save, ShieldCheck, XCircle } from "lucide-react";

import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

import { fetchEmailSettings, updateEmailSettings } from "../api/email-settings.service";
import {
  emailSettingsSchema,
  getEmailSettingsErrorMap,
} from "../utils/email-settings.schema";
import {
  emptyEmailSettingsForm,
  formatEmailDomainStatus,
  mapEmailSettingsToFormValues,
  maskEmailSettingsField,
} from "../utils/email-settings.utils";
import type {
  EmailSettingsFormErrors,
  EmailSettingsFormValues,
  EmailSettingsStatus,
} from "../types/email-settings.types";

export function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<EmailSettingsFormErrors>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["email-settings"],
    queryFn: fetchEmailSettings,
  });

  const mutation = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: (response) => {
      const nextValues = mapEmailSettingsToFormValues(response.settings);

      queryClient.setQueryData(["email-settings"], response);
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      form.reset(nextValues);
      setLocalError(null);
      setFieldErrors({});

      toast({
        title: "Configurações de email salvas",
        description: "Os proximos envios ja usam as regras desse tenant.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar as configuracoes de email.";

      setLocalError(message);
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: emptyEmailSettingsForm,
    onSubmit: async ({ value }) => {
      const validation = emailSettingsSchema.safeParse(value);

      if (!validation.success) {
        setFieldErrors(getEmailSettingsErrorMap(validation.error.issues));
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

    form.reset(mapEmailSettingsToFormValues(settingsQuery.data?.settings ?? null));
    queueMicrotask(() => setHasLoadedRemoteData(true));
  }, [form, hasLoadedRemoteData, settingsQuery.data, settingsQuery.isLoading]);

  const isLoading = settingsQuery.isLoading && !hasLoadedRemoteData;
  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);
  const emailStatus = settingsQuery.data?.status ?? null;

  function clearFieldError(field: keyof EmailSettingsFormValues) {
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

  function handleMaskedChange<K extends keyof EmailSettingsFormValues>(
    field: K,
    rawValue: EmailSettingsFormValues[K],
    setValue: (value: EmailSettingsFormValues[K]) => void
  ) {
    const nextValue = maskEmailSettingsField(field, rawValue);

    setValue(nextValue);
    clearFieldError(field);
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col gap-6">
      <Header
        title="Configurações de email"
        description="Remetente, resposta, domínio futuro e destinatários internos das notificações do tenant."
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
            {emailStatus ? <EmailStatusPanel status={emailStatus} /> : null}

            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-6 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-heading text-base font-700 text-foreground">
                        Canal oficial do tenant
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        O Resend continua centralizado na plataforma; aqui ficam apenas as preferências do tenant.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="h-fit w-fit">
                    {formatEmailDomainStatus(
                      settingsQuery.data?.settings?.emailDomainStatus ?? "NOT_CONFIGURED"
                    )}
                  </Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  <form.Field name="notificationsEnabled">
                    {(field) => (
                      <Field className="lg:col-span-12">
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 p-4">
                          <div className="space-y-1">
                            <FieldLabel>Notificações internas</FieldLabel>
                            <FieldDescription>
                              Ativa relatórios e avisos para os destinatários cadastrados.
                            </FieldDescription>
                          </div>
                          <Switch
                            checked={field.state.value}
                            onCheckedChange={(checked) => {
                              field.handleChange(checked);
                              clearFieldError("notificationsEnabled");
                            }}
                          />
                        </div>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="fromName">
                    {(field) => (
                      <InputField
                        field="fromName"
                        label="Nome do remetente"
                        wrapperClassName="lg:col-span-6"
                        placeholder="Nome da oficina"
                        value={field.state.value}
                        error={fieldErrors.fromName}
                        onChange={(event) =>
                          handleMaskedChange("fromName", event.target.value, field.handleChange)
                        }
                      />
                    )}
                  </form.Field>

                  <form.Field name="fromAddress">
                    {(field) => (
                      <InputField
                        field="fromAddress"
                        label="Email remetente"
                        wrapperClassName="lg:col-span-6"
                        inputMode="email"
                        placeholder="no-reply@seudominio.com"
                        value={field.state.value}
                        error={fieldErrors.fromAddress}
                        onChange={(event) =>
                          handleMaskedChange(
                            "fromAddress",
                            event.target.value,
                            field.handleChange
                          )
                        }
                      />
                    )}
                  </form.Field>

                  <form.Field name="replyTo">
                    {(field) => (
                      <InputField
                        field="replyTo"
                        label="E-mail para resposta"
                        wrapperClassName="lg:col-span-12"
                        inputMode="email"
                        placeholder="contato@oficina.com"
                        value={field.state.value}
                        error={fieldErrors.replyTo}
                        onChange={(event) =>
                          handleMaskedChange("replyTo", event.target.value, field.handleChange)
                        }
                      />
                    )}
                  </form.Field>

                  <form.Field name="emailDomain">
                    {(field) => (
                      <InputField
                        field="emailDomain"
                        label="Domínio próprio"
                        wrapperClassName="lg:col-span-6"
                        placeholder="oficina.com"
                        value={field.state.value}
                        error={fieldErrors.emailDomain}
                        onChange={(event) =>
                          handleMaskedChange("emailDomain", event.target.value, field.handleChange)
                        }
                      />
                    )}
                  </form.Field>

                  <Field className="lg:col-span-6">
                    <FieldLabel>Status do domínio</FieldLabel>
                    <FieldControl>
                      <Input
                        value={formatEmailDomainStatus(
                          settingsQuery.data?.settings?.emailDomainStatus ?? "NOT_CONFIGURED"
                        )}
                        readOnly
                      />
                    </FieldControl>
                    <FieldDescription>
                      A verificação do domínio será plugada neste módulo em uma próxima etapa.
                    </FieldDescription>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-700 text-foreground">
                      Destinatários de relatórios e avisos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Use vírgula ou ponto e vírgula para cadastrar mais de um email.
                    </p>
                  </div>
                </div>

                <form.Field name="notificationEmails">
                  {(field) => (
                    <TextareaField
                      field="notificationEmails"
                      label="Emails que recebem notificações"
                      placeholder="financeiro@oficina.com; gestor@oficina.com"
                      value={field.state.value}
                      error={fieldErrors.notificationEmails}
                      onChange={(event) =>
                        handleMaskedChange(
                          "notificationEmails",
                          event.target.value,
                          field.handleChange
                        )
                      }
                    />
                  )}
                </form.Field>
              </CardContent>
            </Card>

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>Erro ao salvar configurações de email</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Esses dados são usados pelo serviço central de email antes de acionar o provider.
          </p>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading || isSaving}
            className="gap-2"
          >
            {isSaving ? <Spinner size="sm" /> : <Save className="size-4" />}
            {isSaving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function EmailStatusPanel({ status }: { status: EmailSettingsStatus }) {
  const Icon =
    status.severity === "success"
      ? CheckCircle2
      : status.severity === "warning"
        ? AlertCircle
        : XCircle;
  const toneClassName = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
  }[status.severity];

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${toneClassName}`}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-700 text-foreground">
                Status da configuração
              </h2>
              <p className="text-sm text-muted-foreground">{status.summary}</p>
            </div>
          </div>
          <Badge variant={status.configured ? "default" : "secondary"} className="h-fit w-fit">
            {status.configured ? "Tudo ok" : "Incompleto"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusMetric
            label="Provider"
            value={status.provider.configured ? "Resend OK" : "Resend pendente"}
            description={
              status.provider.apiKeyConfigured
                ? "API key encontrada no ambiente."
                : "RESEND_API_KEY ausente."
            }
            ok={status.provider.configured}
          />
          <StatusMetric
            label="Remetente"
            value={status.sender.fromAddress ?? "Nao configurado"}
            description={status.sender.fromName ?? "Nome do remetente opcional."}
            ok={status.sender.configured}
          />
          <StatusMetric
            label="Destinatarios"
            value={`${status.notifications.recipientCount} cadastrado(s)`}
            description={
              status.notifications.enabled
                ? "Notificacoes internas ativas."
                : "Notificacoes internas desativadas."
            }
            ok={status.notifications.ready}
          />
          <StatusMetric
            label="Dominio"
            value={formatEmailDomainStatus(status.domain.status)}
            description={
              status.domain.configured
                ? "Dominio informado para futura verificacao."
                : "Opcional nesta etapa."
            }
            ok={!status.domain.configured || status.domain.status === "VERIFIED"}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {status.checks.map((check) => (
            <div
              key={check.key}
              className="min-w-0 rounded-md border border-border/70 bg-card/80 p-3"
            >
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                )}
                <p className="text-sm font-medium text-foreground">{check.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{check.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusMetric({
  label,
  value,
  description,
  ok,
}: {
  label: string;
  value: string;
  description: string;
  ok: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-card/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {ok ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
        )}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

type FieldConfig = {
  field: keyof EmailSettingsFormValues;
  label: string;
  placeholder?: string;
  inputMode?: "text" | "email" | "url";
  wrapperClassName?: string;
};

function InputField({
  field,
  label,
  placeholder,
  inputMode,
  wrapperClassName,
  value,
  error,
  onChange,
}: FieldConfig & {
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Field className={wrapperClassName} data-field={field}>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl>
        <Input
          id={field}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
      </FieldControl>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function TextareaField({
  field,
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
    <Field data-field={field}>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl>
        <Textarea
          id={field}
          value={value}
          placeholder={placeholder}
          rows={5}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
      </FieldControl>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
