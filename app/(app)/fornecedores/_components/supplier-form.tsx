"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";

import { createSupplier, updateSupplier } from "../supplier-api";
import { supplierFormSchema } from "../supplier-form-schema";
import { maskSupplierFormField } from "../supplier-input-masks";
import type { Supplier, SupplierFormValues } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SupplierFormProps = {
  initialData?: Supplier | null;
};

function mapSupplierToForm(supplier?: Supplier | null): SupplierFormValues {
  return {
    personType: supplier?.personType ?? "FISICA",
    name: supplier?.name ?? "",
    cpf: supplier?.cpf ?? "",
    rg: supplier?.rg ?? "",
    contact: supplier?.contact ?? "",
    productLine: supplier?.productLine ?? "",
    phone1: supplier?.phone1 ?? "",
    phone2: supplier?.phone2 ?? "",
    phone3: supplier?.phone3 ?? "",
    phone4: supplier?.phone4 ?? "",
    email: supplier?.email ?? "",
    website: supplier?.website ?? "",
    cep: supplier?.cep ?? "",
    city: supplier?.city ?? "",
    state: supplier?.state ?? "",
    address: supplier?.address ?? "",
    neighborhood: supplier?.neighborhood ?? "",
    bank: supplier?.bank ?? "",
    account: supplier?.account ?? "",
    agency: supplier?.agency ?? "",
    notes: supplier?.notes ?? "",
  };
}

function formatZodError(error: ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export function SupplierForm({ initialData }: SupplierFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupplierFormValues>(() => mapSupplierToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = supplierFormSchema.safeParse(form);

      if (!parsed.success) {
        throw new Error(formatZodError(parsed.error));
      }

      if (mode === "edit" && initialData) {
        return updateSupplier(initialData.id, parsed.data);
      }

      return createSupplier(parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-options"] });
      router.push("/fornecedores");
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Não foi possível salvar o fornecedor."
      );
    },
  });

  function updateField<Key extends keyof SupplierFormValues>(
    key: Key,
    value: SupplierFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: maskSupplierFormField(key, value) }));
    setLocalError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold">
          {mode === "edit" ? "Editar fornecedor" : "Cadastro de Fornecedor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Dados comerciais, contatos, endereço e informações bancárias.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-medium">Dados do Fornecedor</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Pessoa</Label>
            <Select
              value={form.personType}
              onValueChange={(value) => updateField("personType", value as SupplierFormValues["personType"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FISICA">Física</SelectItem>
                <SelectItem value="JURIDICA">Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={(event) => updateField("cpf", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>RG</Label>
            <Input value={form.rg} onChange={(event) => updateField("rg", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contato</Label>
            <Input value={form.contact} onChange={(event) => updateField("contact", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Linha de produtos</Label>
            <Input
              value={form.productLine}
              onChange={(event) => updateField("productLine", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-medium">Contato</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {(["phone1", "phone2", "phone3", "phone4"] as const).map((field, index) => (
            <div className="space-y-2" key={field}>
              <Label>Telefone {index + 1}</Label>
              <Input value={form[field]} onChange={(event) => updateField(field, event.target.value)} />
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Site</Label>
            <Input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-medium">Endereço</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input value={form.cep} onChange={(event) => updateField("cep", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input value={form.state} onChange={(event) => updateField("state", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Bairro</Label>
            <Input
              value={form.neighborhood}
              onChange={(event) => updateField("neighborhood", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-medium">Banco</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input value={form.bank} onChange={(event) => updateField("bank", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Conta</Label>
            <Input value={form.account} onChange={(event) => updateField("account", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Agência</Label>
            <Input value={form.agency} onChange={(event) => updateField("agency", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>OBS</Label>
            <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/fornecedores")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
