"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Fraunces, Sora } from "next/font/google";

import { fetchClients } from "../../clientes/client-api";
import { fetchVehicles } from "../../veiculos/vehicle-api";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { createEstimate, updateEstimate } from "../estimate-api";
import { estimateStatusOptions } from "../status";
import type {
  Estimate,
  EstimateFormValues,
  EstimateItemFormValues,
  EstimatePayload,
  EstimateStatus,
} from "../types";
import { Badge } from "@/components/ui/badge";
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

const titleFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Sora({ subsets: ["latin"], weight: ["400", "500", "600"] });

function createEmptyItem(): EstimateItemFormValues {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`,
    description: "",
    quantity: "1",
    unitPrice: "",
    discount: "0",
  };
}

const emptyForm: EstimateFormValues = {
  clientId: "",
  vehicleId: "",
  responsible: "",
  validUntil: "",
  status: "RASCUNHO",
  type: "SIMPLES",
  notesInternal: "",
  notesClient: "",
  items: [createEmptyItem()],
};

function toInputDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-CA");
}

function mapEstimateToForm(estimate: Estimate): EstimateFormValues {
  const items = estimate.items ?? [];

  return {
    clientId: estimate.clientId,
    vehicleId: estimate.vehicleId,
    responsible: estimate.responsible ?? "",
    validUntil: toInputDate(estimate.validUntil),
    status: estimate.status,
    type: estimate.type ?? "SIMPLES",
    notesInternal: estimate.notesInternal ?? "",
    notesClient: estimate.notesClient ?? "",
    items:
      items.length > 0
        ? items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice ?? ""),
            discount: String(item.discount ?? "0"),
          }))
        : [createEmptyItem()],
  };
}

function normalizeAmount(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type EstimateFormProps = {
  mode: "create" | "edit";
  initialData?: Estimate | null;
};

export function EstimateForm({ mode, initialData }: EstimateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EstimateFormValues>(() =>
    initialData ? mapEstimateToForm(initialData) : emptyForm
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const sessionQuery = useAuthSession();
  const sessionName = sessionQuery.data?.user?.name ?? sessionQuery.data?.user?.email ?? "";
  const responsibleValue = form.responsible || (!initialData ? sessionName : "");

  const clientsQuery = useQuery({
    queryKey: ["estimate-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["estimate-vehicles"],
    queryFn: () => fetchVehicles({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const availableVehicles = useMemo(() => {
    const vehicles = vehiclesQuery.data?.items ?? [];
    if (!form.clientId) {
      return vehicles;
    }
    return vehicles.filter((vehicle) => vehicle.clientId === form.clientId);
  }, [vehiclesQuery.data, form.clientId]);

  const mutation = useMutation({
    mutationFn: async (payload: EstimatePayload) => {
      if (mode === "edit" && initialData?.id) {
        return updateEstimate(initialData.id, payload);
      }
      return createEstimate(payload);
    },
    onSuccess: (estimate) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.setQueryData(["estimate", estimate.id], estimate);
      router.push("/orcamentos");
      router.refresh();
    },
  });

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;

    form.items.forEach((item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      const discount = normalizeAmount(item.discount);
      subtotal += quantity * unitPrice;
      discountTotal += discount;
    });

    return {
      subtotal,
      discountTotal,
      total: Math.max(subtotal - discountTotal, 0),
    };
  }, [form.items]);

  const onChange = (field: keyof EstimateFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  function updateItem(itemId: string, field: keyof EstimateItemFormValues, value: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  }

  function removeItem(itemId: string) {
    setForm((prev) => {
      const nextItems = prev.items.filter((item) => item.id !== itemId);
      return { ...prev, items: nextItems.length > 0 ? nextItems : [createEmptyItem()] };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.clientId) {
      setLocalError("Selecione o cliente.");
      return;
    }

    if (!form.vehicleId) {
      setLocalError("Selecione o veiculo.");
      return;
    }

    if (!responsibleValue.trim()) {
      setLocalError("Responsavel e obrigatorio.");
      return;
    }

    const invalidItem = form.items.find((item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      return !item.description.trim() || quantity <= 0 || unitPrice <= 0;
    });

    if (invalidItem) {
      setLocalError("Preencha descricao, quantidade e valor unitario dos itens.");
      return;
    }

    const payload: EstimatePayload = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      responsible: responsibleValue.trim(),
      validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
      status: form.status,
      type: form.type.trim() || "SIMPLES",
      notesInternal: form.notesInternal.trim() || null,
      notesClient: form.notesClient.trim() || null,
      items: form.items.map((item) => ({
        description: item.description.trim(),
        quantity: Math.trunc(normalizeAmount(item.quantity)),
        unitPrice: normalizeAmount(item.unitPrice),
        discount: normalizeAmount(item.discount),
      })),
    };

    mutation.mutate(payload);
  }

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  return (
    <div className={`${bodyFont.className} border bg-white p-6 shadow-sm`}>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Orcamento de oficina
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              {mode === "edit" ? "Editar orcamento" : "Novo orcamento"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Monte servicos, pecas, descontos e aprove a OS a partir da proposta.
            </p>
          </div>
          <Badge variant="secondary" className="h-fit text-[11px]">
            {estimateStatusOptions.find((option) => option.value === form.status)?.label}
          </Badge>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Dados do orcamento</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        clientId: value,
                        vehicleId: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          clientsQuery.isLoading ? "Carregando clientes..." : "Selecione"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientsQuery.data?.items ?? []).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clientsQuery.isError ? (
                    <p className="text-xs text-destructive">
                      Nao foi possivel carregar clientes.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value as EstimateStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {estimateStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Veiculo</Label>
                  <Select
                    value={form.vehicleId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, vehicleId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          vehiclesQuery.isLoading ? "Carregando veiculos..." : "Selecione"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} {vehicle.model ? `- ${vehicle.model}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Input value={form.type} onChange={onChange("type")} />
                </div>
                <div className="grid gap-2">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={onChange("validUntil")}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Responsavel</Label>
                  <Input value={responsibleValue} onChange={onChange("responsible")} />
                </div>
              </div>
            </section>

            <section className="border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Servicos e pecas</h2>
                  <p className="text-xs text-muted-foreground">
                    Inclua mao de obra, pecas e descontos por linha.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={addItem}>
                  Adicionar item
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {form.items.map((item, index) => {
                  const quantity = normalizeAmount(item.quantity);
                  const unitPrice = normalizeAmount(item.unitPrice);
                  const discount = normalizeAmount(item.discount);
                  const lineTotal = Math.max(quantity * unitPrice - discount, 0);

                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 border border-dashed bg-muted/30 p-3 md:grid-cols-[2.2fr_0.8fr_1fr_1fr_auto]"
                    >
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Descricao</Label>
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, "description", event.target.value)
                          }
                          placeholder={`Item ${index + 1}`}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Qtd</Label>
                        <Input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, "quantity", event.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Valor</Label>
                        <Input
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, "unitPrice", event.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">Desconto</Label>
                        <Input
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(item.id, "discount", event.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(lineTotal)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Observacoes</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Observacao interna</Label>
                  <Textarea
                    value={form.notesInternal}
                    onChange={onChange("notesInternal")}
                    rows={5}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Observacao para o cliente</Label>
                  <Textarea
                    value={form.notesClient}
                    onChange={onChange("notesClient")}
                    rows={5}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Resumo financeiro</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total servicos</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-semibold text-amber-700">
                    -{formatCurrency(totals.discountTotal)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Total da nota</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </section>

            <section className="border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Acoes</h2>
              <div className="mt-4 space-y-3">
                {errorMessage ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {errorMessage}
                  </div>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar orcamento"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/orcamentos")}
                >
                  Cancelar
                </Button>
              </div>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
