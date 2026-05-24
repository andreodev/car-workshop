"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";

import { useAuthSession } from "@/app/hooks/useAuthSession";
import {
  createSupplierOrder,
  fetchSuppliers,
  updateSupplierOrder,
} from "../supplier-api";
import { supplierOrderFormSchema } from "../supplier-order-form-schema";
import type { SupplierOrder, SupplierOrderFormValues } from "../types";
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

type SupplierOrderFormProps = {
  initialData?: SupplierOrder | null;
};

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function mapOrderToForm(order?: SupplierOrder | null): SupplierOrderFormValues {
  return {
    supplierId: order?.supplierId ?? "",
    status: order?.status ?? "ABERTO",
    employee: order?.employee ?? "",
    forecastAt: toDateInput(order?.forecastAt),
    invoiceNumber: order?.invoiceNumber ?? "",
    observation: order?.observation ?? "",
    internalDescription: order?.internalDescription ?? "",
  };
}

function formatZodError(error: ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export function SupplierOrderForm({ initialData }: SupplierOrderFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();
  const [form, setForm] = useState<SupplierOrderFormValues>(() => mapOrderToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";

  const sessionName = useMemo(() => {
    return session?.user?.name || session?.user?.email?.split("@")[0] || "";
  }, [session]);
  const employeeValue = form.employee || (!initialData ? sessionName : "");

  const suppliersQuery = useQuery({
    queryKey: ["supplier-options"],
    queryFn: () => fetchSuppliers({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const values = { ...form, employee: employeeValue.trim() };
      const parsed = supplierOrderFormSchema.safeParse(values);

      if (!parsed.success) {
        throw new Error(formatZodError(parsed.error));
      }

      if (mode === "edit" && initialData) {
        return updateSupplierOrder(initialData.id, parsed.data);
      }

      return createSupplierOrder(parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
      router.push("/fornecedores/pedidos");
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Não foi possível salvar o pedido."
      );
    },
  });

  function updateField<Key extends keyof SupplierOrderFormValues>(
    key: Key,
    value: SupplierOrderFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
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
          {mode === "edit" ? "Editar pedido para fornecedor" : "Cadastrar Pedido Para Fornecedor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Registre previsão, nota fiscal e observações internas do pedido.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Fornecedor</Label>
          <Select
            value={form.supplierId || undefined}
            onValueChange={(value) => updateField("supplierId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliersQuery.data?.items.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  #{supplier.code} - {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suppliersQuery.data?.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Cadastre um fornecedor antes de lançar pedidos.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Funcionário</Label>
          <Input value={employeeValue} onChange={(event) => updateField("employee", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Situação</Label>
          <Select
            value={form.status}
            onValueChange={(value) => updateField("status", value as SupplierOrderFormValues["status"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="RECEBIDO">Recebido</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Previsão</Label>
          <Input
            type="date"
            value={form.forecastAt}
            onChange={(event) => updateField("forecastAt", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Número NF</Label>
          <Input
            value={form.invoiceNumber}
            onChange={(event) => updateField("invoiceNumber", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea
            value={form.observation}
            onChange={(event) => updateField("observation", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Descrição interna</Label>
          <Textarea
            value={form.internalDescription}
            onChange={(event) => updateField("internalDescription", event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/fornecedores/pedidos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
