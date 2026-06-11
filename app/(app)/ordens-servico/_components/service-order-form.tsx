"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { fetchClients } from "@/modules/client/api/client.service";
import { fetchMechanics } from "../../mecanicos/mechanic-api";
import {
  addCatalogItemStock,
  createCatalogItem,
  fetchCatalogItems,
  fetchSectors,
} from "@/modules/pdv/api/pdv.service";
import type { CatalogItem, CatalogItemListResponse } from "@/modules/pdv/types/pdv.types";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  formatAmountInput,
  maskServiceOrderItemField,
} from "../service-order-input-masks";

function createEmptyItem(): ServiceOrderItemFormValues {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`,
    type: "SERVICE",
    catalogItemId: "",
    mechanicId: "",
    sectorId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discount: "0",
    commissionBase: "",
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
            mechanicId: item.mechanicId ?? order.mechanicId ?? "",
            sectorId: item.sectorId ?? "",
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: formatAmountInput(item.unitPrice),
            discount: formatAmountInput(
              calculateDiscountPercent(
                Number(item.quantity),
                Number(item.unitPrice ?? 0),
                item.discount ?? "0"
              ),
            ),
            commissionBase:
              item.commissionBase === null ? "" : formatAmountInput(item.commissionBase),
          }))
        : [createEmptyItem()],
  };
}

function normalizeAmount(value: string) {
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateDiscountValue(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
) {
  const subtotal = quantity * unitPrice;
  return roundCurrency(subtotal * (discountPercent / 100));
}

function calculateDiscountPercent(
  quantity: number,
  unitPrice: number,
  discountValue: string | number,
) {
  const subtotal = quantity * unitPrice;
  const parsedDiscount =
    typeof discountValue === "number"
      ? discountValue
      : normalizeAmount(String(discountValue));

  if (subtotal <= 0 || parsedDiscount <= 0) {
    return "0";
  }

  return String(roundCurrency((parsedDiscount / subtotal) * 100));
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

function getCommissionBaseValue(
  item: ServiceOrderItemFormValues,
  lineTotal: number,
) {
  const rawCommissionBase = item.commissionBase.trim();

  if (rawCommissionBase) {
    return normalizeAmount(rawCommissionBase);
  }

  return item.type === "SERVICE" ? lineTotal : 0;
}

function getItemValidationMessage(
  item: ServiceOrderItemFormValues,
  index: number,
) {
  const itemLabel = `Item ${index + 1}`;
  const quantity = normalizeAmount(item.quantity);
  const unitPrice = normalizeAmount(item.unitPrice);
  const discountPercent = normalizeAmount(item.discount);
  const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
  const lineTotal = Math.max(quantity * unitPrice - discount, 0);
  const commissionBase = getCommissionBaseValue(item, lineTotal);
  const isService = item.type === "SERVICE";

  if (!item.description.trim()) {
    return `${itemLabel}: preencha a descrição.`;
  }

  if (item.type === "PRODUCT" && !item.catalogItemId) {
    return `${itemLabel}: selecione o produto no catálogo.`;
  }

  if (isService && !item.mechanicId) {
    return `${itemLabel}: selecione o mecânico.`;
  }

  if (isService && !item.sectorId) {
    return `${itemLabel}: selecione o setor.`;
  }

  if (quantity <= 0) {
    return `${itemLabel}: informe uma quantidade maior que zero.`;
  }

  if (unitPrice <= 0) {
    return `${itemLabel}: informe um valor maior que zero.`;
  }

  if (discountPercent < 0 || discountPercent > 100) {
    return `${itemLabel}: informe um desconto entre 0% e 100%.`;
  }

  if (isService && commissionBase < 0) {
    return `${itemLabel}: a base de comissão não pode ser negativa.`;
  }

  if (isService && commissionBase > lineTotal) {
    return `${itemLabel}: a base de comissão não pode ser maior que o total do item.`;
  }

  return null;
}

type ServiceOrderFormProps = {
  mode: "create" | "edit";
  initialData?: ServiceOrder | null;
};

type QuickCatalogDialogState = {
  mode: "create" | "stock";
  itemId: string;
} | null;

type QuickCatalogFormValues = {
  name: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  stockMinimum: string;
  notes: string;
};

const emptyQuickCatalogForm: QuickCatalogFormValues = {
  name: "",
  quantity: "1",
  unitPrice: "0",
  unit: "UN",
  stockMinimum: "0",
  notes: "",
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
  const [quickCatalogDialog, setQuickCatalogDialog] =
    useState<QuickCatalogDialogState>(null);
  const [quickCatalogForm, setQuickCatalogForm] =
    useState<QuickCatalogFormValues>(emptyQuickCatalogForm);
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

  const sectorsQuery = useQuery({
    queryKey: ["service-order-sectors"],
    queryFn: () => fetchSectors({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const catalogItems = catalogItemsQuery.data?.items ?? [];
  const mechanics = mechanicsQuery.data?.items ?? [];
  const sectors = sectorsQuery.data?.items ?? [];

  function mergeCatalogItemIntoCaches(catalogItem: CatalogItem) {
    const updater = (data: CatalogItemListResponse | undefined) => {
      if (!data) return data;

      const exists = data.items.some((item) => item.id === catalogItem.id);
      const items = exists
        ? data.items.map((item) => (item.id === catalogItem.id ? catalogItem : item))
        : [catalogItem, ...data.items];

      return {
        ...data,
        items,
        total: exists ? data.total : Math.max(data.total + 1, items.length),
      };
    };

    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["service-order-catalog-items"] },
      updater
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["catalog-items"] },
      updater
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["pdv-catalog-items"] },
      updater
    );
  }

  const quickCatalogMutation = useMutation({
    mutationFn: async () => {
      if (!quickCatalogDialog) {
        throw new Error("Ação de produto inválida.");
      }

      const quantity = normalizeAmount(quickCatalogForm.quantity);

      if (quantity <= 0) {
        throw new Error("Informe uma quantidade maior que zero.");
      }

      if (quickCatalogDialog.mode === "create") {
        const name = quickCatalogForm.name.trim();
        const unitPrice = normalizeAmount(quickCatalogForm.unitPrice);

        if (!name) {
          throw new Error("Informe o nome do produto.");
        }

        if (unitPrice <= 0) {
          throw new Error("Informe o valor unitário do produto.");
        }

        return createCatalogItem({
          name,
          type: "PRODUTO",
          unitPrice,
          salePrice: String(unitPrice),
          stockCurrent: String(quantity),
          stockMinimum: String(normalizeAmount(quickCatalogForm.stockMinimum)),
          unit: quickCatalogForm.unit.trim() || "UN",
          active: true,
        });
      }

      const formItem = form.items.find((item) => item.id === quickCatalogDialog.itemId);

      if (!formItem?.catalogItemId) {
        throw new Error("Selecione um produto para adicionar estoque.");
      }

      return addCatalogItemStock(formItem.catalogItemId, {
        quantity,
        notes: quickCatalogForm.notes.trim() || undefined,
      });
    },
    onSuccess: async (catalogItem) => {
      mergeCatalogItemIntoCaches(catalogItem);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-order-catalog-items"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog-items"] }),
        queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] }),
      ]);

      if (quickCatalogDialog?.mode === "create") {
        setForm((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === quickCatalogDialog.itemId
              ? {
                  ...item,
                  type: "PRODUCT",
                  catalogItemId: catalogItem.id,
                  description: catalogItem.name,
                  unitPrice: formatAmountInput(catalogItem.unitPrice),
                  sectorId: catalogItem.sectorId ?? item.sectorId,
                }
              : item
          ),
        }));
      }

      toast({
        title:
          quickCatalogDialog?.mode === "create"
            ? "Produto cadastrado"
            : "Estoque atualizado",
        description: "O catálogo foi atualizado sem sair da OS.",
        variant: "success",
      });
      setQuickCatalogDialog(null);
      setQuickCatalogForm(emptyQuickCatalogForm);
      setLocalError(null);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível atualizar o produto.";
      toast({
        title: "Erro no produto",
        description: message,
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["service-order-catalog-items"] });
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
      const discountPercent = normalizeAmount(item.discount);
      const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
      subtotal += quantity * unitPrice;
      discountTotal += discount;
    });

    const commissionBaseTotal = form.items.reduce((sum, item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      const discountPercent = normalizeAmount(item.discount);
      const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
      const lineTotal = Math.max(quantity * unitPrice - discount, 0);

      return item.type === "SERVICE" ? sum + getCommissionBaseValue(item, lineTotal) : sum;
    }, 0);

    return {
      subtotal,
      discountTotal,
      total: Math.max(subtotal - discountTotal, 0),
      commissionBaseTotal,
    };
  }, [form.items]);

  const onChange = (field: keyof ServiceOrderFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setLocalError(null);
    };

  function updateItem(itemId: string, field: keyof ServiceOrderItemFormValues, value: string) {
    const nextValue = maskServiceOrderItemField(field, value);

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: nextValue } : item
      ),
    }));
    setLocalError(null);
  }

  function updateItemType(itemId: string, type: ServiceOrderItemFormValues["type"]) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              type,
              catalogItemId: "",
              mechanicId: type === "SERVICE" ? item.mechanicId : "",
              sectorId: type === "SERVICE" ? item.sectorId : "",
              commissionBase: type === "SERVICE" ? item.commissionBase : "",
            }
          : item
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
              unitPrice: catalogItem
                ? formatAmountInput(catalogItem.unitPrice)
                : item.unitPrice,
              sectorId: catalogItem?.sectorId ?? item.sectorId,
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
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...createEmptyItem() }],
    }));
  }

  function openQuickProductCreate(itemId: string) {
    const formItem = form.items.find((item) => item.id === itemId);

    setQuickCatalogDialog({ mode: "create", itemId });
    setQuickCatalogForm({
      ...emptyQuickCatalogForm,
      name: formItem?.description.trim() ?? "",
      quantity: formItem?.quantity || "1",
      unitPrice: formItem?.unitPrice || "0",
    });
  }

  function openQuickStockAdd(itemId: string, catalogItem: CatalogItem | undefined) {
    const formItem = form.items.find((item) => item.id === itemId);
    const requestedQuantity = normalizeAmount(formItem?.quantity ?? "1");
    const currentStock = normalizeAmount(catalogItem?.stockCurrent ?? "0");
    const missingQuantity = Math.max(requestedQuantity - currentStock, 1);

    setQuickCatalogDialog({ mode: "stock", itemId });
    setQuickCatalogForm({
      ...emptyQuickCatalogForm,
      quantity: String(missingQuantity),
      notes: "Reposição feita durante edição da OS.",
    });
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

    const invalidItemMessage = form.items
      .map((item, index) => getItemValidationMessage(item, index))
      .find((message): message is string => Boolean(message));

    if (invalidItemMessage) {
      setLocalError(invalidItemMessage);
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
        mechanicId: item.type === "SERVICE" ? item.mechanicId || null : null,
        sectorId: item.type === "SERVICE" ? item.sectorId || null : null,
        description: item.description.trim(),
        quantity: Math.trunc(normalizeAmount(item.quantity)),
        unitPrice: normalizeAmount(item.unitPrice),
        discount: calculateDiscountValue(
          normalizeAmount(item.quantity),
          normalizeAmount(item.unitPrice),
          normalizeAmount(item.discount)
        ),
        commissionBase: item.type === "SERVICE" && item.commissionBase.trim()
          ? normalizeAmount(item.commissionBase)
          : null,
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
    sectorsQuery.isLoading ||
    catalogItemsQuery.isLoading;
  const quickDialogItem = quickCatalogDialog
    ? form.items.find((item) => item.id === quickCatalogDialog.itemId)
    : undefined;
  const quickDialogCatalogItem = quickDialogItem?.catalogItemId
    ? catalogItems.find((item) => item.id === quickDialogItem.catalogItemId)
    : undefined;
  const isQuickCatalogSaving = quickCatalogMutation.isPending;

  if (isLoadingOptions) {
    return (
      <FormLoadingState
        title="Carregando ordem de serviço..."
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full min-w-0 flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ServiceOrderFormStepValue)}
          className="min-w-0 flex-1"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:gap-8">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <Header
                title={mode === "edit" ? "Editar ordem de serviço" : "Nova ordem de serviço"}
                description="Registre a OS, acompanhe itens e mantenha o time alinhado."
              />
              <Badge variant="secondary" className="h-fit w-fit text-[11px]">
                {serviceOrderStatusOptions.find((option) => option.value === form.status)?.label}
              </Badge>
            </div>

            <div className="pb-2 sm:pb-6">
              <ServiceOrderFormStepper activeStep={activeTab} />
            </div>

            <div className="min-w-0 rounded-lg border border-border bg-white/70 p-4 shadow-sm sm:p-6">
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
                        <div className="grid min-w-0 gap-2 md:col-span-2">
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

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid min-w-0 gap-2 md:col-span-2">
                          <Label>Mecânico</Label>
                          <Select
                            value={form.mechanicId}
                            onValueChange={(value) => {
                              setForm((prev) => ({
                                ...prev,
                                mechanicId: value,
                                items: prev.items.map((item) => ({
                                  ...item,
                                  mechanicId: item.mechanicId || value,
                                })),
                              }));
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
                              {mechanics.map((mechanic) => (
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
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid min-w-0 gap-2 md:col-span-2">
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
                        <div className="grid min-w-0 gap-2 md:col-span-2">
                          <Label>Responsável</Label>
                          <Input value={responsibleValue} onChange={onChange("responsible")} />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid min-w-0 gap-2">
                          <Label>Data prevista</Label>
                          <Input
                            type="date"
                            value={form.estimatedDate}
                            onChange={onChange("estimatedDate")}
                          />
                        </div>
                        <div className="grid min-w-0 gap-2">
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
                    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <h3 className="font-heading text-lg text-foreground">
                            Itens e serviços
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Registre os itens executados e atualize o total automaticamente.
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="h-10 w-full sm:w-fit"
                          onClick={addItem}
                        >
                          Adicionar item
                        </Button>
                      </div>

                      <div className="space-y-4 p-5">
                        {form.items.map((item, index) => {
                          const quantity = normalizeAmount(item.quantity);
                          const unitPrice = normalizeAmount(item.unitPrice);
                          const discountPercent = normalizeAmount(item.discount);
                          const discount = calculateDiscountValue(
                            quantity,
                            unitPrice,
                            discountPercent
                          );
                          const lineTotal = Math.max(quantity * unitPrice - discount, 0);
                          const commissionBase = getCommissionBaseValue(item, lineTotal);
                          const availableCatalogItems = catalogItems.filter((catalogItem) =>
                            item.type === "PRODUCT"
                              ? catalogItem.type === "PRODUTO"
                              : catalogItem.type === "SERVICO"
                          );
                          const selectedCatalogItem = catalogItems.find(
                            (catalogItem) => catalogItem.id === item.catalogItemId
                          );
                          const selectedStock = normalizeAmount(
                            selectedCatalogItem?.stockCurrent ?? "0"
                          );
                          const hasInsufficientStock =
                            item.type === "PRODUCT" &&
                            Boolean(selectedCatalogItem) &&
                            quantity > selectedStock;

                          return (
                            <details
                              key={item.id}
                              className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
                              open={index === 0}
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      Item {index + 1}
                                    </span>
                                    <Badge variant="outline">
                                      {item.type === "PRODUCT" ? "Produto" : "Serviço"}
                                    </Badge>
                                    {hasInsufficientStock ? (
                                      <Badge variant="destructive">Estoque baixo</Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {item.description || "Nenhuma descrição"}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-3">
                                  <span className="font-mono text-sm font-semibold">
                                    {formatCurrency(lineTotal)}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      removeItem(item.id);
                                    }}
                                  >
                                    Remover
                                  </Button>
                                </div>
                              </summary>

                              <div className="border-t border-border p-5">
                                <div className="grid gap-5 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Tipo</Label>
                                    <Select
                                      value={item.type}
                                      onValueChange={(value) =>
                                        updateItemType(
                                          item.id,
                                          value as ServiceOrderItemFormValues["type"]
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-11 w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="SERVICE">Serviço</SelectItem>
                                        <SelectItem value="PRODUCT">Produto</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="grid gap-2">
                                    <Label>Catálogo</Label>
                                    <Select
                                      value={item.catalogItemId || "MANUAL"}
                                      onValueChange={(value) =>
                                        updateItemCatalog(
                                          item.id,
                                          value === "MANUAL" ? "" : value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-11 w-full">
                                        <SelectValue
                                          placeholder={
                                            catalogItemsQuery.isLoading
                                              ? "Carregando..."
                                              : "Manual"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="MANUAL">
                                          {item.type === "PRODUCT"
                                            ? "Selecione produto"
                                            : "Manual"}
                                        </SelectItem>
                                        {availableCatalogItems.map((catalogItem) => (
                                          <SelectItem
                                            key={catalogItem.id}
                                            value={catalogItem.id}
                                          >
                                            #{catalogItem.code} {catalogItem.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {item.type === "PRODUCT" ? (
                                      <div className="flex flex-col gap-2 pt-1">
                                        {selectedCatalogItem ? (
                                          <span
                                            className={
                                              hasInsufficientStock
                                                ? "text-xs font-medium text-destructive"
                                                : "text-xs text-muted-foreground"
                                            }
                                          >
                                            Estoque: {selectedStock}. Solicitado: {quantity || 0}.
                                          </span>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => openQuickProductCreate(item.id)}
                                          >
                                            Cadastrar produto
                                          </Button>
                                          {hasInsufficientStock ? (
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              className="h-8"
                                              onClick={() =>
                                                openQuickStockAdd(item.id, selectedCatalogItem)
                                              }
                                            >
                                              Adicionar estoque
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  {item.type === "SERVICE" ? (
                                    <>
                                      <div className="grid gap-2">
                                        <Label>Mecânico do item</Label>
                                        <Select
                                          value={item.mechanicId}
                                          onValueChange={(value) =>
                                            updateItem(item.id, "mechanicId", value)
                                          }
                                        >
                                          <SelectTrigger className="h-11 w-full">
                                            <SelectValue
                                              placeholder={
                                                mechanicsQuery.isLoading
                                                  ? "Carregando..."
                                                  : "Selecione"
                                              }
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {mechanics.map((mechanic) => (
                                              <SelectItem key={mechanic.id} value={mechanic.id}>
                                                {mechanic.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="grid gap-2">
                                        <Label>Setor do item</Label>
                                        <Select
                                          value={item.sectorId}
                                          onValueChange={(value) =>
                                            updateItem(item.id, "sectorId", value)
                                          }
                                        >
                                          <SelectTrigger className="h-11 w-full">
                                            <SelectValue
                                              placeholder={
                                                sectorsQuery.isLoading
                                                  ? "Carregando..."
                                                  : "Selecione"
                                              }
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {sectors.map((sector) => (
                                              <SelectItem key={sector.id} value={sector.id}>
                                                {sector.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </>
                                  ) : null}

                                  <div className="grid gap-2 md:col-span-2">
                                    <Label>
                                      {item.type === "SERVICE"
                                        ? "Nome do serviço"
                                        : "Nome do produto"}
                                    </Label>
                                    <Input
                                      className="h-11"
                                      value={item.description}
                                      onChange={(event) =>
                                        updateItem(
                                          item.id,
                                          "description",
                                          event.target.value
                                        )
                                      }
                                      placeholder={`Item ${index + 1}`}
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <Label>Quantidade</Label>
                                    <Input
                                      className="h-11"
                                      inputMode="numeric"
                                      value={item.quantity}
                                      onChange={(event) =>
                                        updateItem(item.id, "quantity", event.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <Label>Valor unitário</Label>
                                    <Input
                                      className="h-11"
                                      inputMode="decimal"
                                      value={item.unitPrice}
                                      onChange={(event) =>
                                        updateItem(item.id, "unitPrice", event.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <Label>Desconto (%)</Label>
                                    <Input
                                      className="h-11"
                                      inputMode="decimal"
                                      value={item.discount}
                                      onChange={(event) =>
                                        updateItem(item.id, "discount", event.target.value)
                                      }
                                    />
                                  </div>

                                  {item.type === "SERVICE" ? (
                                    <div className="grid gap-2">
                                      <Label>Base comissão</Label>
                                      <Input
                                        className="h-11"
                                        inputMode="decimal"
                                        value={item.commissionBase}
                                        onChange={(event) =>
                                          updateItem(
                                            item.id,
                                            "commissionBase",
                                            event.target.value
                                          )
                                        }
                                        placeholder={formatCurrency(lineTotal)}
                                      />
                                    </div>
                                  ) : null}

                                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm md:col-span-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-muted-foreground">Total do item</span>
                                      <span className="font-mono font-semibold">
                                        {formatCurrency(lineTotal)}
                                      </span>
                                    </div>
                                    {item.type === "SERVICE" ? (
                                      <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">
                                          Base comissionável
                                        </span>
                                        <span className="font-mono font-semibold">
                                          {formatCurrency(commissionBase)}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </details>
                          );
                        })}
                      </div>

                      <div className="mx-5 mb-5 w-auto rounded-2xl border border-border bg-background p-5 text-sm shadow-sm sm:ml-auto sm:max-w-lg">
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
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-muted-foreground">Base comissão</span>
                          <span className="font-semibold">
                            {formatCurrency(totals.commissionBaseTotal)}
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
                        <div className="grid min-w-0 gap-2">
                          <Label>Observação interna</Label>
                          <Textarea
                            value={form.notesInternal}
                            onChange={onChange("notesInternal")}
                            rows={5}
                          />
                        </div>
                        <div className="grid min-w-0 gap-2">
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

            <div className="sticky bottom-0 z-30 -mx-4 mt-auto flex flex-col items-stretch justify-between gap-3 border-t border-border/70 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:flex-row lg:items-center lg:gap-4 lg:bg-transparent lg:px-0 lg:pb-0 lg:pr-20 lg:pt-6 lg:shadow-none lg:backdrop-blur-none 2xl:pr-0">
              <p className="hidden text-xs text-muted-foreground sm:block">
                Revise os dados antes de salvar. A ordem ficará disponível para acompanhamento.
              </p>

              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-row lg:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="h-10 w-full lg:h-8 lg:w-auto"
                  onClick={() => router.push("/ordens-servico")}
                >
                  Cancelar
                </Button>
                {previousStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-10 w-full lg:h-8 lg:w-auto"
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
                    className="h-10 w-full lg:h-8 lg:w-auto"
                    onClick={() => setActiveTab(nextStep)}
                  >
                    Próxima
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full sm:col-span-2 lg:h-8 lg:w-auto"
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar ordem de serviço"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </form>
      <Dialog
        open={Boolean(quickCatalogDialog)}
        onOpenChange={(open) => {
          if (!open && !isQuickCatalogSaving) {
            setQuickCatalogDialog(null);
            setQuickCatalogForm(emptyQuickCatalogForm);
            quickCatalogMutation.reset();
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {quickCatalogDialog?.mode === "create"
                ? "Cadastrar produto"
                : "Adicionar estoque"}
            </DialogTitle>
            <DialogDescription>
              {quickCatalogDialog?.mode === "create"
                ? "Crie o produto e selecione-o automaticamente nesta OS."
                : `Reposição para ${quickDialogCatalogItem?.name ?? "o produto selecionado"}.`}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              quickCatalogMutation.mutate();
            }}
          >
            {quickCatalogDialog?.mode === "create" ? (
              <>
                <div className="grid gap-2">
                  <Label>Nome do produto</Label>
                  <Input
                    value={quickCatalogForm.name}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    autoFocus
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Estoque inicial</Label>
                    <Input
                      inputMode="decimal"
                      value={quickCatalogForm.quantity}
                      onChange={(event) =>
                        setQuickCatalogForm((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor unitário</Label>
                    <Input
                      inputMode="decimal"
                      value={quickCatalogForm.unitPrice}
                      onChange={(event) =>
                        setQuickCatalogForm((prev) => ({
                          ...prev,
                          unitPrice: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unidade</Label>
                    <Input
                      value={quickCatalogForm.unit}
                      onChange={(event) =>
                        setQuickCatalogForm((prev) => ({
                          ...prev,
                          unit: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Estoque mínimo</Label>
                  <Input
                    inputMode="decimal"
                    value={quickCatalogForm.stockMinimum}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        stockMinimum: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {quickDialogCatalogItem?.name ?? "Produto selecionado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estoque atual:{" "}
                    {normalizeAmount(quickDialogCatalogItem?.stockCurrent ?? "0")}. Quantidade
                    na OS: {normalizeAmount(quickDialogItem?.quantity ?? "0")}.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade para adicionar</Label>
                  <Input
                    inputMode="decimal"
                    value={quickCatalogForm.quantity}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        quantity: event.target.value,
                      }))
                    }
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={quickCatalogForm.notes}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </>
            )}

            {quickCatalogMutation.error ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                {quickCatalogMutation.error instanceof Error
                  ? quickCatalogMutation.error.message
                  : "Não foi possível salvar."}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isQuickCatalogSaving}
                onClick={() => {
                  setQuickCatalogDialog(null);
                  setQuickCatalogForm(emptyQuickCatalogForm);
                  quickCatalogMutation.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isQuickCatalogSaving}>
                {isQuickCatalogSaving
                  ? "Salvando..."
                  : quickCatalogDialog?.mode === "create"
                    ? "Cadastrar e usar"
                    : "Adicionar estoque"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
