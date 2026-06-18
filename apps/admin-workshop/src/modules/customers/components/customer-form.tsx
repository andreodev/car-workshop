"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  customerSchema,
  type CustomerFormValues,
} from "../types/customer.types";

type CustomerFormProps = {
  defaultValues?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => void;
  isSubmitting?: boolean;
};

export function CustomerForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      document: "",
      phone: "",
      email: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Nome</span>
        <Input {...form.register("name")} placeholder="Nome do cliente" />
        {form.formState.errors.name ? (
          <span className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </span>
        ) : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            CPF/CNPJ
          </span>
          <Input {...form.register("document")} placeholder="Documento" />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Telefone
          </span>
          <Input {...form.register("phone")} placeholder="Telefone" />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">E-mail</span>
        <Input {...form.register("email")} placeholder="email@exemplo.com" />
        {form.formState.errors.email ? (
          <span className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <Button type="submit" className="w-fit" disabled={isSubmitting}>
        <Save />
        Salvar cliente
      </Button>
    </form>
  );
}
