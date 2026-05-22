"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Fraunces, Sora } from "next/font/google";

import { fetchClients } from "../../clientes/client-api";
import { fetchVehicles } from "../../veiculos/vehicle-api";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { serviceOrderStatusOptions } from "../status";
import { createServiceOrder, updateServiceOrder } from "../service-order-api";
import type {
  ServiceOrder,
  ServiceOrderFormValues,
  ServiceOrderItemFormValues,
  ServiceOrderPayload,
  ServiceOrderStatus,
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

function createEmptyItem(): ServiceOrderItemFormValues {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`,
    description: "",
    quantity: "1",
    unitPrice: "",
    discount: "0",
  };
}

const emptyForm: ServiceOrderFormValues = {
  clientId: "",
  vehicleId: "",
  responsible: "",
  location: "",
  km: "",
  entryDate: "",
  entryTime: "",
  estimatedDate: "",
  estimatedTime: "",
  status: "ABERTA",
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

function toInputTime(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function mapOrderToForm(order: ServiceOrder): ServiceOrderFormValues {
  const items = order.items ?? [];

  return {
    clientId: order.clientId,
    vehicleId: order.vehicleId,
    responsible: order.responsible ?? "",
    location: order.location ?? "",
    km: order.km ? String(order.km) : "",
    entryDate: toInputDate(order.entryAt),
    entryTime: toInputTime(order.entryAt),
    estimatedDate: toInputDate(order.estimatedAt),
    estimatedTime: toInputTime(order.estimatedAt),
    status: order.status,
    notesInternal: order.notesInternal ?? "",
    notesClient: order.notesClient ?? "",
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

function combineDateTime(date: string, time: string) {
  if (!date) {
    return null;
  }
  const normalizedTime = time && time.trim().length > 0 ? time : "00:00";
  const iso = new Date(`${date}T${normalizedTime}:00`).toISOString();
  return iso;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type ServiceOrderFormProps = {
  mode: "create" | "edit";
  initialData?: ServiceOrder | null;
};

export function ServiceOrderForm({ mode, initialData }: ServiceOrderFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ServiceOrderFormValues>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);

  const sessionQuery = useAuthSession();

  useEffect(() => {
    if (initialData) {
      setForm(mapOrderToForm(initialData));
    }
  }, [initialData]);

  useEffect(() => {
    const sessionName = sessionQuery.data?.user?.name ?? sessionQuery.data?.user?.email ?? "";
    if (!initialData && sessionName && !form.responsible) {
      setForm((prev) => ({ ...prev, responsible: sessionName }));
    }
  }, [form.responsible, initialData, sessionQuery.data]);

  const clientsQuery = useQuery({
    queryKey: ["service-order-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["service-order-vehicles"],
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

  useEffect(() => {
    if (!form.vehicleId) {
      return;
    }
    const exists = availableVehicles.some((vehicle) => vehicle.id === form.vehicleId);
    if (!exists) {
      setForm((prev) => ({ ...prev, vehicleId: "" }));
    }
  }, [availableVehicles, form.vehicleId]);

  const mutation = useMutation({
    mutationFn: async (payload: ServiceOrderPayload) => {
      if (mode === "edit" && initialData?.id) {
        return updateServiceOrder(initialData.id, payload);
      }
      return createServiceOrder(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      router.push("/ordens-servico");
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

  const onChange = (field: keyof ServiceOrderFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  function updateItem(itemId: string, field: keyof ServiceOrderItemFormValues, value: string) {
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

    if (!form.responsible.trim()) {
      setLocalError("Responsavel e obrigatorio.");
      return;
    }

    if (!form.entryDate) {
      setLocalError("Data de entrada e obrigatoria.");
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

    const payload: ServiceOrderPayload = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      responsible: form.responsible.trim(),
      location: form.location.trim() || null,
      km: form.km ? Math.trunc(normalizeAmount(form.km)) : null,
      entryAt: combineDateTime(form.entryDate, form.entryTime) ?? "",
      estimatedAt: combineDateTime(form.estimatedDate, form.estimatedTime),
      status: form.status,
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
    <div
      className={`${bodyFont.className} relative overflow-hidden rounded-[32px] border bg-white/80 p-6 shadow-lg backdrop-blur`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.2),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-sky-100/70 via-transparent to-emerald-100/70" />

      <div className="relative z-10 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Oficina integrada
            </p>
            <h1 className={`${titleFont.className} text-2xl text-foreground md:text-3xl`}>
              {mode === "edit" ? "Editar ordem de servico" : "Nova ordem de servico"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Registre a OS, acompanhe itens e mantenha o time alinhado.
            </p>
          </div>
          <Badge variant="secondary" className="h-fit text-[11px]">
            {serviceOrderStatusOptions.find((option) => option.value === form.status)?.label}
          </Badge>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-semibold text-foreground">Cabecalho</h2>
              <p className="text-xs text-muted-foreground">
                Cliente, veiculo e datas principais da OS.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, clientId: value }))
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
                      setForm((prev) => ({
                        ...prev,
                        status: value as ServiceOrderStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOrderStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                  {vehiclesQuery.isError ? (
                    <p className="text-xs text-destructive">
                      Nao foi possivel carregar veiculos.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label>Responsavel</Label>
                  <Input value={form.responsible} onChange={onChange("responsible")} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Localizacao</Label>
                  <Input value={form.location} onChange={onChange("location")} />
                </div>
                <div className="grid gap-2">
                  <Label>Km</Label>
                  <Input value={form.km} onChange={onChange("km")} />
                </div>
                <div className="grid gap-2">
                  <Label>Data entrada</Label>
                  <Input type="date" value={form.entryDate} onChange={onChange("entryDate")} />
                </div>
                <div className="grid gap-2">
                  <Label>Hora entrada</Label>
                  <Input type="time" value={form.entryTime} onChange={onChange("entryTime")} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Data prevista</Label>
                  <Input
                    type="date"
                    value={form.estimatedDate}
                    onChange={onChange("estimatedDate")}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Hora prevista</Label>
                  <Input
                    type="time"
                    value={form.estimatedTime}
                    onChange={onChange("estimatedTime")}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Itens e servicos</h2>
                  <p className="text-xs text-muted-foreground">
                    Registre os itens executados e atualize o total automaticamente.
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
                      className="grid gap-3 rounded-xl border border-dashed bg-muted/30 p-3 md:grid-cols-[2.2fr_0.8fr_1fr_1fr_auto]"
                    >
                      <div className="grid gap-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Descricao
                        </Label>
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, "description", event.target.value)
                          }
                          placeholder={`Servico ${index + 1}`}
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

            <section className="rounded-2xl border bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <section className="rounded-2xl border bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-semibold text-foreground">Resumo financeiro</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Descontos</span>
                  <span className="font-semibold text-amber-700">
                    -{formatCurrency(totals.discountTotal)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-semibold text-foreground">Acoes</h2>
              <div className="mt-4 space-y-3">
                {errorMessage ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {errorMessage}
                  </div>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar ordem de servico"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/ordens-servico")}
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
