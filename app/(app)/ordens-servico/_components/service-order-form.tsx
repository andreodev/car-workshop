"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { fetchClients } from "@/modules/client/api/client.service";
import { fetchMechanics } from "../../mecanicos/mechanic-api";
import { fetchCatalogItems } from "../../pdv/pdv-api";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { serviceOrderStatusOptions } from "../status";
import { createServiceOrder, updateServiceOrder } from "../service-order-api";
import {
  ServiceOrderFormStepper,
  serviceOrderFormSteps,
  type ServiceOrderFormStepValue,
} from "./service-order-form-stepper";
import type {
  ServiceOrder,
  ServiceOrderFormValues,
  ServiceOrderItemFormValues,
  ServiceOrderPayload,
} from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormLoadingState } from "@/components/ui/form-loading-state";
import Header from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { vehiclesService } from "@/modules/vehicle/api/vehicle.service";

function createEmptyItem(): ServiceOrderItemFormValues {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`,
    type: "SERVICE",
    catalogItemId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discount: "0",
  };
}

const emptyForm: ServiceOrderFormValues = {
  clientId: "",
  vehicleId: "",
  mechanicId: "",
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
    mechanicId: order.mechanicId ?? "",
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
            type: item.type,
            catalogItemId: item.catalogItemId ?? "",
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
  const [form, setForm] = useState<ServiceOrderFormValues>(() =>
    initialData ? mapOrderToForm(initialData) : emptyForm
  );
  const [activeTab, setActiveTab] =
    useState<ServiceOrderFormStepValue>("cabecalho");
  const [localError, setLocalError] = useState<string | null>(null);
  const { toast } = useToast();

  const sessionQuery = useAuthSession();
  const sessionName = sessionQuery.data?.user?.name ?? sessionQuery.data?.user?.email ?? "";
  const responsibleValue = form.responsible || (!initialData ? sessionName : "");

  const clientsQuery = useQuery({
    queryKey: ["service-order-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["service-order-vehicles"],
    queryFn: () => vehiclesService.list({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const catalogItemsQuery = useQuery({
    queryKey: ["service-order-catalog-items"],
    queryFn: () => fetchCatalogItems({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });

  const mechanicsQuery = useQuery({
    queryKey: ["service-order-mechanics"],
    queryFn: () => fetchMechanics({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const catalogItems = catalogItemsQuery.data?.items ?? [];

  const availableVehicles = useMemo(() => {
    const vehicles = vehiclesQuery.data?.items ?? [];
    if (!form.clientId) {
      return vehicles;
    }
    return vehicles.filter((vehicle) => vehicle.clientId === form.clientId);
  }, [vehiclesQuery.data, form.clientId]);

  const mutation = useMutation({
    mutationFn: async (payload: ServiceOrderPayload) => {
      if (mode === "edit" && initialData?.id) {
        return updateServiceOrder(initialData.id, payload);
      }
      return createServiceOrder(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      if (mode === "edit" && initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ["service-order", initialData.id] });
      }
      toast({
        title: mode === "edit" ? "OS atualizada" : "OS criada",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });
      router.push("/ordens-servico");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar a OS.";
      setLocalError(message);
      toast({
        title: "Erro ao salvar OS",
        description: message,
        variant: "destructive",
      });
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
      setLocalError(null);
    };

  function updateItem(itemId: string, field: keyof ServiceOrderItemFormValues, value: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
    setLocalError(null);
  }

  function updateItemType(itemId: string, type: ServiceOrderItemFormValues["type"]) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, type, catalogItemId: "" } : item
      ),
    }));
    setLocalError(null);
  }

  function updateItemCatalog(itemId: string, catalogItemId: string) {
    const catalogItem = catalogItems.find((item) => item.id === catalogItemId);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              catalogItemId,
              description: catalogItem?.name ?? item.description,
              unitPrice: catalogItem ? String(catalogItem.unitPrice) : item.unitPrice,
              type: catalogItem
                ? catalogItem.type === "PRODUTO"
                  ? "PRODUCT"
                  : "SERVICE"
                : item.type,
            }
          : item
      ),
    }));
    setLocalError(null);
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
      setActiveTab("cabecalho");
      return;
    }

    if (!form.vehicleId) {
      setLocalError("Selecione o veículo.");
      setActiveTab("cabecalho");
      return;
    }

    if (!form.mechanicId) {
      setLocalError("Selecione o mecânico.");
      setActiveTab("cabecalho");
      return;
    }

    if (!responsibleValue.trim()) {
      setLocalError("Responsável é obrigatório.");
      setActiveTab("cabecalho");
      return;
    }

    if (!form.entryDate) {
      setLocalError("Data de entrada e obrigatória.");
      setActiveTab("cabecalho");
      return;
    }

    const invalidItem = form.items.find((item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      return (
        !item.description.trim() ||
        (item.type === "PRODUCT" && !item.catalogItemId) ||
        quantity <= 0 ||
        unitPrice <= 0
      );
    });

    if (invalidItem) {
      setLocalError("Preencha tipo, produto quando necessário, descrição, quantidade e valor unitário dos itens.");
      setActiveTab("itens");
      return;
    }

    const payload: ServiceOrderPayload = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      mechanicId: form.mechanicId,
      responsible: responsibleValue.trim(),
      location: form.location.trim() || null,
      km: form.km ? Math.trunc(normalizeAmount(form.km)) : null,
      entryAt: combineDateTime(form.entryDate, form.entryTime) ?? "",
      estimatedAt: combineDateTime(form.estimatedDate, form.estimatedTime),
      status: form.status,
      notesInternal: form.notesInternal.trim() || null,
      notesClient: form.notesClient.trim() || null,
      items: form.items.map((item) => ({
        type: item.type,
        catalogItemId: item.catalogItemId || null,
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
  const activeStepIndex = serviceOrderFormSteps.findIndex(
    (step) => step.value === activeTab
  );
  const previousStep = serviceOrderFormSteps[activeStepIndex - 1]?.value;
  const nextStep = serviceOrderFormSteps[activeStepIndex + 1]?.value;
  const isLoadingOptions =
    clientsQuery.isLoading ||
    vehiclesQuery.isLoading ||
    mechanicsQuery.isLoading ||
    catalogItemsQuery.isLoading;

  if (isLoadingOptions) {
    return (
      <FormLoadingState
        title="Carregando ordem de serviço..."
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ServiceOrderFormStepValue)}
          className="flex-1"
        >
          <div className="flex flex-1 flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <Header
                title={mode === "edit" ? "Editar ordem de serviço" : "Nova ordem de serviço"}
                description="Registre a OS, acompanhe itens e mantenha o time alinhado."
              />
              <Badge variant="secondary" className="h-fit text-[11px]">
                {serviceOrderStatusOptions.find((option) => option.value === form.status)?.label}
              </Badge>
            </div>


            <div className="pb-6">
              <ServiceOrderFormStepper activeStep={activeTab} />
            </div>

            <div className="rounded-3xl border-2 border-gray-700 bg-white/60 p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {activeTab === "cabecalho" ? (
                    <section className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg text-foreground">Cabeçalho</h3>
                        <p className="text-sm text-muted-foreground">
                          Cliente, veículo e datas principais da OS.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2 md:col-span-2">
                          <Label>Cliente</Label>
                          <Select
                            value={form.clientId}
                            onValueChange={(value) => {
                              setForm((prev) => ({ ...prev, clientId: value, vehicleId: "" }));
                              setLocalError(null);
                            }}
                          >
                            <SelectTrigger className="w-full">
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
                              Não foi possível carregar clientes.
                            </p>
                          ) : null}
                        </div>
                      </div>


<div className="grid gap-2">
  <Label>Mecânico</Label>

  <Select
    value={form.mechanicId}
    onValueChange={(value) => {
      setForm((prev) => ({ ...prev, mechanicId: value }));
      setLocalError(null);
    }}
  >
    <SelectTrigger className="w-full">
      <SelectValue
        placeholder={
          mechanicsQuery.isLoading ? "Carregando mecânicos..." : "Selecione"
        }
      />
    </SelectTrigger>

    <SelectContent>
      {(mechanicsQuery.data?.items ?? []).map((mechanic) => (
        <SelectItem key={mechanic.id} value={mechanic.id}>
          {mechanic.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {mechanicsQuery.isError ? (
    <p className="text-xs text-destructive">
      Não foi possível carregar mecânicos.
    </p>
  ) : null}
</div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2 md:col-span-2">
                          <Label>Veículo</Label>
                          <Select
                            value={form.vehicleId}
                            onValueChange={(value) => {
                              setForm((prev) => ({ ...prev, vehicleId: value }));
                              setLocalError(null);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  vehiclesQuery.isLoading ? "Carregando veículos..." : "Selecione"
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
                              Não foi possível carregar veículos.
                            </p>
                          ) : null}
                        </div>

                
                      </div>

                      

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                          <Label>Responsável</Label>
                          <Input value={responsibleValue} onChange={onChange("responsible")} />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
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
                  ) : null}

                  {activeTab === "itens" ? (
                    <section className="space-y-5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <h3 className="font-heading text-lg text-foreground">
                            Itens e serviços
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Registre os itens executados e atualize o total automaticamente.
                          </p>
                        </div>
                        <Button type="button" variant="secondary" onClick={addItem}>
                          Adicionar item
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {form.items.map((item, index) => {
                          const quantity = normalizeAmount(item.quantity);
                          const unitPrice = normalizeAmount(item.unitPrice);
                          const discount = normalizeAmount(item.discount);
                          const lineTotal = Math.max(quantity * unitPrice - discount, 0);
                          const availableCatalogItems = catalogItems.filter((catalogItem) =>
                            item.type === "PRODUCT"
                              ? catalogItem.type === "PRODUTO"
                              : catalogItem.type === "SERVICO"
                          );

                          return (
                            <div
                              key={item.id}
                              className="grid gap-3 rounded-xl border border-dashed bg-muted/30 p-3 md:grid-cols-[0.8fr_1.4fr_1.8fr_0.7fr_0.9fr_0.9fr_auto]"
                            >
                              <div className="grid gap-1">
                                <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value) =>
                                    updateItemType(
                                      item.id,
                                      value as ServiceOrderItemFormValues["type"]
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SERVICE">Serviço</SelectItem>
                                    <SelectItem value="PRODUCT">Produto</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Catálogo
                                </Label>
                                <Select
                                  value={item.catalogItemId || "MANUAL"}
                                  onValueChange={(value) =>
                                    updateItemCatalog(item.id, value === "MANUAL" ? "" : value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={
                                        catalogItemsQuery.isLoading ? "Carregando..." : "Manual"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MANUAL">
                                      {item.type === "PRODUCT" ? "Selecione produto" : "Manual"}
                                    </SelectItem>
                                    {availableCatalogItems.map((catalogItem) => (
                                      <SelectItem key={catalogItem.id} value={catalogItem.id}>
                                        #{catalogItem.code} {catalogItem.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Descrição
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
                                <Label className="text-[11px] text-muted-foreground">
                                  Desconto
                                </Label>
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

                      <div className="ml-auto max-w-md rounded-2xl border border-border bg-background/70 p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-muted-foreground">Descontos</span>
                          <span className="font-semibold text-amber-700">
                            -{formatCurrency(totals.discountTotal)}
                          </span>
                        </div>
                        <div className="my-3 h-px bg-border" />
                        <div className="flex items-center justify-between text-base">
                          <span className="font-semibold">Total</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(totals.total)}
                          </span>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {activeTab === "observações" ? (
                    <section className="space-y-5">
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg text-foreground">Observações</h3>
                        <p className="text-sm text-muted-foreground">
                          Registre notas internas e mensagens visiveis ao cliente.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Observação interna</Label>
                          <Textarea
                            value={form.notesInternal}
                            onChange={onChange("notesInternal")}
                            rows={5}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Observação para o cliente</Label>
                          <Textarea
                            value={form.notesClient}
                            onChange={onChange("notesClient")}
                            rows={5}
                          />
                        </div>
                      </div>
                    </section>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {errorMessage ? (
                <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">
                Revise os dados antes de salvar. A ordem ficará disponível para acompanhamento.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push("/ordens-servico")}
                >
                  Cancelar
                </Button>
                {previousStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setActiveTab(previousStep)}
                  >
                    Anterior
                  </Button>
                ) : null}
                {nextStep ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setActiveTab(nextStep)}
                  >
                    Próxima
                  </Button>
                ) : null}
                <Button type="submit" size="lg" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar ordem de serviço"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </form>
    </section>
  );
}
