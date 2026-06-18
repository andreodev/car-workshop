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
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormLoadingState } from "@/components/ui/form-loading-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

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
    total: order?.total ? String(order.total) : "0",
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
  const { toast } = useToast();

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
      toast({
        title: mode === "edit" ? "Pedido atualizado" : "Pedido cadastrado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });
      router.push("/pedidos");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar o pedido.";
      setLocalError(message);
      toast({
        title: "Erro ao salvar pedido",
        description: message,
        variant: "destructive",
      });
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

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  if (suppliersQuery.isLoading) {
    return (
      <FormLoadingState
        title="Carregando cadastro de pedido..."
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8">
          <Header
            title={mode === "edit" ? "Editar pedido" : "Cadastro de pedido"}
            description="Registre previsão, nota fiscal e observações internas do pedido."
          />

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-6 pt-6">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro ao salvar pedido</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
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
                  <Input
                    value={employeeValue}
                    onChange={(event) => updateField("employee", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Situação</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      updateField("status", value as SupplierOrderFormValues["status"])
                    }
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
                  <Label>Total</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total}
                    onChange={(event) => updateField("total", event.target.value)}
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
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Revise os dados antes de salvar. O pedido ficará disponível no controle de compras.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.push("/pedidos")}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                {isSaving ? <Spinner size="sm" /> : null}
                {isSaving ? "Salvando..." : "Salvar pedido"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
