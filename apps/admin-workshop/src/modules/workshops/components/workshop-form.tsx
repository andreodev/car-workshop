"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  workshopFormSchema,
  type WorkshopFormValues,
} from "../types/workshop.types";

type WorkshopFormProps = {
  onSubmit: (values: WorkshopFormValues) => void;
  isSubmitting?: boolean;
};

export function WorkshopForm({ onSubmit, isSubmitting }: WorkshopFormProps) {
  const form = useForm<WorkshopFormValues>({
    resolver: zodResolver(workshopFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      legalName: "",
      tradeName: "",
      document: "",
      email: "",
      phone: "",
      customDomain: "",
      logoUrl: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da oficina" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} placeholder="Rikinho Auto Center" />
        </Field>

        <Field label="Slug" error={form.formState.errors.slug?.message}>
          <Input {...form.register("slug")} placeholder="rikinho-auto-center" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Razao social" error={form.formState.errors.legalName?.message}>
          <Input {...form.register("legalName")} placeholder="Rikinho Auto Center LTDA" />
        </Field>

        <Field label="Nome fantasia" error={form.formState.errors.tradeName?.message}>
          <Input {...form.register("tradeName")} placeholder="Rikinho Auto Center" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="CPF/CNPJ" error={form.formState.errors.document?.message}>
          <Input {...form.register("document")} placeholder="12345678000190" />
        </Field>

        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <Input type="email" {...form.register("email")} placeholder="admin@oficina.com.br" />
        </Field>

        <Field label="Telefone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} placeholder="95999999999" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Dominio personalizado" error={form.formState.errors.customDomain?.message}>
          <Input {...form.register("customDomain")} placeholder="app.oficina.com.br" />
        </Field>

        <Field label="Logo URL" error={form.formState.errors.logoUrl?.message}>
          <Input {...form.register("logoUrl")} placeholder="https://cdn.exemplo.com/logo.png" />
        </Field>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
          Criar oficina
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
