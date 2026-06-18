"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  CheckCircle2,
  Circle,
  UserCog,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "react-modal";

import { fetchClients } from "@/modules/client/api/client.service";
import { fetchMechanics } from "@/app/(app)/mecanicos/mechanic-api";
import {
  addCatalogItemStock,
  createCatalogItem,
  fetchAllCatalogItems,
  fetchSectors,
} from "@/modules/pdv/api/pdv.service";
import type { CatalogItem, CatalogItemListResponse } from "@/modules/pdv/types/pdv.types";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { createEstimate, updateEstimate } from "../api/estimate.service";
import { estimateStatusOptions } from "../utils/estimate-status";
import type {
  Estimate,
  EstimateFormValues,
  EstimateItemFormValues,
  EstimatePayload,
} from "../types/estimate.types";
import { EstimateItemsStep } from "./estimate-items-step";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { vehiclesService } from "@/modules/vehicle/api/vehicle.service";
import {
  formatAmountInput,
  maskEstimateItemField,
} from "../utils/estimate-input-masks";
import {
  calculateDiscountValue,
  createEmptyEstimateItem,
  dateInputToUtcEndOfDay,
  emptyEstimateForm,
  formatCurrency,
  getCommissionBaseValue,
  getEstimateItemValidationError,
  getVehicleLabel,
  mapEstimateToForm,
  normalizeAmount,
} from "../utils/estimate-form-utils";

type EstimateFormProps = {
  mode: "create" | "edit";
  initialData?: Estimate | null;
};

type QuickCatalogDialogState = {
  mode: "create" | "stock";
  itemId: string;
  itemType?: EstimateItemFormValues["type"];
  catalogItemId?: string;
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

type EstimateFormStep = "client" | "items" | "review";

export function EstimateForm({ mode, initialData }: EstimateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialForm = useMemo(
    () => (initialData ? mapEstimateToForm(initialData) : emptyEstimateForm),
    [initialData],
  );
  const [form, setForm] = useState<EstimateFormValues>(initialForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const [quickCatalogDialog, setQuickCatalogDialog] =
    useState<QuickCatalogDialogState>(null);
  const [quickCatalogForm, setQuickCatalogForm] =
    useState<QuickCatalogFormValues>(emptyQuickCatalogForm);
  const [activeStep, setActiveStep] = useState<EstimateFormStep>("client");
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    () => new Set(initialForm.items[0]?.id ? [initialForm.items[0].id] : []),
  );
  const sessionQuery = useAuthSession();
  const sessionName =
    sessionQuery.data?.user?.name ?? sessionQuery.data?.user?.email ?? "";
  const responsibleValue = sessionName || "";
  const { toast } = useToast();

  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
const [shouldSubmitAfterObservation, setShouldSubmitAfterObservation] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["estimate-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["estimate-vehicles"],
    queryFn: () => vehiclesService.list({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const mechanicsQuery = useQuery({
    queryKey: ["estimate-mechanics", { includeInactive: mode === "edit" }],
    queryFn: () =>
      fetchMechanics({
        page: 1,
        pageSize: 50,
        includeInactive: mode === "edit",
      }),
    staleTime: 60_000,
  });

  const sectorsQuery = useQuery({
    queryKey: ["estimate-sectors", { includeInactive: mode === "edit" }],
    queryFn: () =>
      fetchSectors({ page: 1, pageSize: 50, includeInactive: mode === "edit" }),
    staleTime: 60_000,
  });

  const catalogItemsQuery = useQuery({
    queryKey: ["estimate-catalog-items"],
    queryFn: () => fetchAllCatalogItems(),
    staleTime: 60_000,
  });

  const catalogItems = useMemo(
    () => catalogItemsQuery.data?.items ?? [],
    [catalogItemsQuery.data],
  );
  const mechanics = useMemo(
    () => mechanicsQuery.data?.items ?? [],
    [mechanicsQuery.data],
  );
  const sectors = useMemo(
    () => sectorsQuery.data?.items ?? [],
    [sectorsQuery.data],
  );

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
      { queryKey: ["estimate-catalog-items"] },
      updater,
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["catalog-items"] },
      updater,
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["pdv-catalog-items"] },
      updater,
    );
  }

  const quickCatalogMutation = useMutation({
    mutationFn: async () => {
      if (!quickCatalogDialog) {
        throw new Error("Ação de catálogo inválida.");
      }

      const quantity = normalizeAmount(quickCatalogForm.quantity);

      if (quickCatalogDialog.mode === "stock" && quantity <= 0) {
        throw new Error("Informe uma quantidade maior que zero.");
      }

      if (quickCatalogDialog.mode === "create") {
        const name = quickCatalogForm.name.trim();
        const unitPrice = normalizeAmount(quickCatalogForm.unitPrice);
        const itemType = quickCatalogDialog.itemType ?? "PRODUCT";
        const catalogType = itemType === "SERVICE" ? "SERVICO" : "PRODUTO";

        if (itemType === "PRODUCT" && quantity <= 0) {
          throw new Error("Informe uma quantidade maior que zero.");
        }

        if (!name) {
          throw new Error(
            itemType === "SERVICE"
              ? "Informe o nome do serviço."
              : "Informe o nome do produto.",
          );
        }

        if (unitPrice <= 0) {
          throw new Error(
            itemType === "SERVICE"
              ? "Informe o valor unitário do serviço."
              : "Informe o valor unitário do produto.",
          );
        }

        return createCatalogItem({
          name,
          type: catalogType,
          unitPrice,
          salePrice: String(unitPrice),
          stockCurrent: itemType === "PRODUCT" ? String(Math.max(quantity, 0)) : "",
          stockMinimum:
            itemType === "PRODUCT"
              ? String(normalizeAmount(quickCatalogForm.stockMinimum))
              : "",
          unit: quickCatalogForm.unit.trim() || "UN",
          sectorId:
            itemType === "SERVICE"
              ? form.items.find((item) => item.id === quickCatalogDialog.itemId)?.sectorId ?? ""
              : "",
          active: true,
        });
      }

      const formItem = form.items.find((item) => item.id === quickCatalogDialog.itemId);
      const catalogItemId = quickCatalogDialog.catalogItemId || formItem?.catalogItemId;

      if (!catalogItemId) {
        throw new Error("Selecione o produto para adicionar estoque.");
      }

      return addCatalogItemStock(catalogItemId, {
        quantity,
        notes: quickCatalogForm.notes.trim() || undefined,
      });
    },
    onSuccess: async (catalogItem) => {
      mergeCatalogItemIntoCaches(catalogItem);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["estimate-catalog-items"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog-items"] }),
        queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] }),
      ]);

      if (quickCatalogDialog?.mode === "create" || quickCatalogDialog?.mode === "stock") {
        const itemType = catalogItem.type === "PRODUTO" ? "PRODUCT" : "SERVICE";
        setForm((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === quickCatalogDialog.itemId
              ? {
                  ...item,
                  type: itemType,
                  catalogItemId: catalogItem.id,
                  description: catalogItem.name,
                  unitPrice: formatAmountInput(catalogItem.unitPrice),
                  sectorId: catalogItem.sectorId ?? item.sectorId,
                }
              : item,
          ),
        }));
      }

      toast({
        title:
          quickCatalogDialog?.mode === "create"
            ? catalogItem.type === "SERVICO"
              ? "Serviço cadastrado"
              : "Produto cadastrado"
            : "Estoque atualizado",
        description: "O catálogo foi atualizado sem sair do orçamento.",
        variant: "success",
      });
      setQuickCatalogDialog(null);
      setQuickCatalogForm(emptyQuickCatalogForm);
      setLocalError(null);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível atualizar o catálogo.";
      toast({
        title: "Erro no catálogo",
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

  const selectedClient = useMemo(() => {
    return (clientsQuery.data?.items ?? []).find(
      (client) => client.id === form.clientId,
    );
  }, [clientsQuery.data, form.clientId]);

  const selectedVehicle = useMemo(() => {
    return (vehiclesQuery.data?.items ?? []).find(
      (vehicle) => vehicle.id === form.vehicleId,
    );
  }, [vehiclesQuery.data, form.vehicleId]);

  const selectedMechanic = useMemo(() => {
    const firstItemMechanicId =
      form.items.find((item) => item.type === "SERVICE" && item.mechanicId)?.mechanicId ?? "";

    return mechanics.find(
      (mechanic) => mechanic.id === firstItemMechanicId,
    );
  }, [mechanics, form.items]);

  const mutation = useMutation({
    mutationFn: async (payload: EstimatePayload) => {
      if (mode === "edit" && initialData?.id) {
        return updateEstimate(initialData.id, payload);
      }
      return createEstimate(payload);
    },
    onSuccess: (estimate) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-catalog-items"] });
      queryClient.setQueryData(["estimate", estimate.id], estimate);
      toast({
        title: mode === "edit" ? "Orçamento atualizado" : "Orçamento criado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });
      router.push("/orcamentos");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o orcamento.";
      setLocalError(message);
      toast({
        title: "Erro ao salvar orcamento",
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

  const onChange =
    (field: keyof EstimateFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  function updateItem(
    itemId: string,
    field: keyof EstimateItemFormValues,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function updateMaskedItem(
    itemId: string,
    field: keyof EstimateItemFormValues,
    value: string,
  ) {
    updateItem(itemId, field, maskEstimateItemField(field, value));
  }

  function updateItemType(
    itemId: string,
    type: EstimateItemFormValues["type"],
  ) {
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
          : item,
      ),
    }));
  }

  function updateItemCatalog(itemId: string, catalogItemId: string) {
    const catalogItem = catalogItems.find((item) => item.id === catalogItemId);

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? catalogItem
            ? {
                ...item,
                catalogItemId,
                description: catalogItem.name,
                unitPrice: formatAmountInput(catalogItem.unitPrice),
                type: catalogItem.type === "PRODUTO" ? "PRODUCT" : "SERVICE",
                sectorId: catalogItem.sectorId ?? item.sectorId,
              }
            : { ...item, catalogItemId: "" }
          : item,
      ),
    }));
  }

  function addItem() {
    const nextItem = createEmptyEstimateItem();

    setForm((prev) => ({
      ...prev,
      items: [...prev.items, nextItem],
    }));
    setExpandedItemIds((prev) => new Set([...prev, nextItem.id]));
  }

  function toggleItemExpanded(itemId: string) {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  function openQuickCatalogCreate(itemId: string) {
    const formItem = form.items.find((item) => item.id === itemId);
    const itemType = formItem?.type ?? "PRODUCT";

    setQuickCatalogDialog({ mode: "create", itemId, itemType });
    setQuickCatalogForm({
      ...emptyQuickCatalogForm,
      name: formItem?.description.trim() ?? "",
      quantity: itemType === "PRODUCT" ? formItem?.quantity || "1" : "0",
      unitPrice: formItem?.unitPrice || "0",
    });
  }

  function openQuickStockAdd(itemId: string, catalogItem: CatalogItem | undefined) {
    const formItem = form.items.find((item) => item.id === itemId);
    const requestedQuantity = normalizeAmount(formItem?.quantity ?? "1");
    const currentStock = normalizeAmount(catalogItem?.stockCurrent ?? "0");
    const missingQuantity = Math.max(requestedQuantity - currentStock, 1);

    setQuickCatalogDialog({
      mode: "stock",
      itemId,
      catalogItemId: catalogItem?.id ?? formItem?.catalogItemId,
    });
    setQuickCatalogForm({
      ...emptyQuickCatalogForm,
      quantity: String(missingQuantity),
      notes: "Reposição feita durante edição do orçamento.",
    });
  }

  function removeItem(itemId: string) {
    const remainingItems = form.items.filter((item) => item.id !== itemId);
    const fallbackItem =
      remainingItems.length > 0 ? undefined : createEmptyEstimateItem();
    const nextItems = fallbackItem ? [fallbackItem] : remainingItems;

    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);

      if (fallbackItem) {
        next.add(fallbackItem.id);
      }

      return next;
    });
    setForm((prev) => ({ ...prev, items: nextItems }));
  }

  function submitEstimate() {
  setShouldSubmitAfterObservation(true);

  requestAnimationFrame(() => {
    const formElement = document.querySelector("form");
    formElement?.requestSubmit();
  });
}

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!shouldSubmitAfterObservation) {
    setIsObservationModalOpen(true);
    return;
  }

  setShouldSubmitAfterObservation(false);
  setLocalError(null);
    event.preventDefault();
    setLocalError(null);

    if (!form.clientId) {
      setLocalError("Selecione o cliente.");
      return;
    }

    if (!form.vehicleId) {
      setLocalError("Selecione o veículo.");
      return;
    }

    if (!responsibleValue.trim()) {
      setLocalError("Responsável é obrigatório.");
      return;
    }

    const itemError = form.items
      .map((item, index) => getEstimateItemValidationError(item, index))
      .find(Boolean);

    if (itemError) {
      setLocalError(itemError);
      return;
    }

    const payload: EstimatePayload = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      responsible: responsibleValue.trim(),
      validUntil: form.validUntil
        ? dateInputToUtcEndOfDay(form.validUntil)
        : null,
      status: form.status,
      type: form.type.trim() || "SIMPLES",
      notesInternal: form.notesInternal.trim() || null,
      notesClient: form.notesClient.trim() || null,
      items: form.items.map((item) => ({
        type: item.type,
        catalogItemId: item.catalogItemId || null,
        mechanicId: item.type === "SERVICE" ? item.mechanicId || null : null,
        sectorId: item.type === "SERVICE" ? item.sectorId || null : null,
        description: item.description.trim().toLocaleUpperCase(),
        quantity: Math.trunc(normalizeAmount(item.quantity)),
        unitPrice: normalizeAmount(item.unitPrice),
        discount: calculateDiscountValue(
          normalizeAmount(item.quantity),
          normalizeAmount(item.unitPrice),
          normalizeAmount(item.discount),
        ),
        commissionBase: item.type === "SERVICE" && item.commissionBase.trim()
          ? normalizeAmount(item.commissionBase)
          : null,
      })),
    };

    mutation.mutate(payload);
  }

  const isSaving = mutation.isPending;
  const errorMessage =
    localError ?? (mutation.error ? mutation.error.message : null);
  const statusOption = estimateStatusOptions.find(
    (option) => option.value === form.status,
  );
  const validItemsCount = form.items.filter((item) => {
    return (
      item.description.trim() &&
      normalizeAmount(item.quantity) > 0 &&
      normalizeAmount(item.unitPrice) > 0
    );
  }).length;
  const canProceedFromClient = Boolean(form.clientId && form.vehicleId);
  const canProceedFromItems = validItemsCount > 0;
  const workflowSteps: Array<{
    id: EstimateFormStep;
    label: string;
    done: boolean;
  }> = [
    { id: "client", label: "Cliente", done: canProceedFromClient },
    { id: "items", label: "Itens", done: canProceedFromItems },
    { id: "review", label: "Salvar", done: false },
  ];
  const completedWorkflowCount = workflowSteps.filter(
    (step) => step.done,
  ).length;
  const workflowProgress = Math.round(
    (completedWorkflowCount / workflowSteps.length) * 100,
  );
  const isLoadingOptions =
    clientsQuery.isLoading ||
    vehiclesQuery.isLoading ||
    mechanicsQuery.isLoading ||
    sectorsQuery.isLoading ||
    catalogItemsQuery.isLoading;
  const quickDialogItem = quickCatalogDialog
    ? form.items.find((item) => item.id === quickCatalogDialog.itemId)
    : undefined;
  const quickDialogCatalogItemId =
    quickCatalogDialog?.mode === "stock"
      ? quickCatalogDialog.catalogItemId || quickDialogItem?.catalogItemId
      : quickDialogItem?.catalogItemId;
  const quickDialogCatalogItem = quickDialogCatalogItemId
    ? catalogItems.find((item) => item.id === quickDialogCatalogItemId)
    : undefined;
  const quickDialogItemType =
    quickCatalogDialog?.itemType ?? quickDialogItem?.type ?? "PRODUCT";
  const productCatalogItems = catalogItems.filter((item) => item.type === "PRODUTO");
  const isQuickCatalogSaving = quickCatalogMutation.isPending;

  if (isLoadingOptions) {
    return (
      <FormLoadingState
        title="Carregando orçamento..."
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-[calc(100vh-3rem)] w-full flex-col gap-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Header
          title={mode === "edit" ? "Editar orçamento" : "Novo orçamento"}
          description="Crie a proposta com cliente, responsável, setor e itens personalizados."
        />
      </div>

      <section className="border-y border-border bg-card">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_240px]">
          <div className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3 lg:border-b-0 lg:border-r">
            <UserRound className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedClient?.name ?? "Cliente pendente"}
              </p>
              <p className="text-xs text-muted-foreground">Cliente</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3 lg:border-b-0 lg:border-r">
            <Car className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {getVehicleLabel(selectedVehicle)}
              </p>
              <p className="text-xs text-muted-foreground">Veículo</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3 lg:border-b-0 lg:border-r">
            <UserCog className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 w-full">
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedMechanic?.name ?? "Mecânico pendente"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Setores por item
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-mono text-base font-semibold text-foreground">
                {formatCurrency(totals.total)}
              </p>
              <p className="text-xs text-muted-foreground">Total previsto</p>
            </div>
            <Badge
              variant={statusOption?.variant ?? "secondary"}
              className={statusOption?.className}
            >
              {statusOption?.label ?? form.status}
            </Badge>
          </div>
        </div>
      </section>

      <section className="w-full border border-border bg-card p-5">
        <div className="flex w-full flex-col gap-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${workflowProgress}%` }}
            />
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const isActive = activeStep === step.id;
              const StepIcon = step.done ? CheckCircle2 : Circle;

              return (
                <button
                  key={step.id}
                  type="button"
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  ].join(" ")}
                  onClick={() => setActiveStep(step.id)}
                >
                  <StepIcon
                    className={[
                      "size-4 shrink-0",
                      step.done
                        ? "text-emerald-600"
                        : isActive
                          ? "text-primary"
                          : "text-muted-foreground",
                    ].join(" ")}
                  />
                  <span className="min-w-0">
                    <span className={isActive ? "font-semibold" : "font-medium"}>
                      {step.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Etapa {index + 1}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {activeStep === "client" ? (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Dados da proposta
          </h2>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-2">
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
            <SelectTrigger className="h-11 w-full">
              <SelectValue
                placeholder={
                  clientsQuery.isLoading
                    ? "Carregando clientes..."
                    : "Selecione"
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
        </div>

        <div className="grid gap-2">
          <Label>Veículo</Label>

          <Select
            value={form.vehicleId}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                vehicleId: value,
              }))
            }
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue
                placeholder={
                  vehiclesQuery.isLoading
                    ? "Carregando veículos..."
                    : "Selecione"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {availableVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {getVehicleLabel(vehicle)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Validade</Label>

          <Input
            type="date"
            className="h-11"
            value={form.validUntil}
            onChange={onChange("validUntil")}
          />
        </div>
      </div>
	    </section>
        ) : null}
	
        {activeStep === "items" ? (
          <EstimateItemsStep
            items={form.items}
            catalogItems={catalogItems}
            mechanics={mechanics}
            sectors={sectors}
            expandedItemIds={expandedItemIds}
            isCatalogLoading={catalogItemsQuery.isLoading}
            isMechanicsLoading={mechanicsQuery.isLoading}
            isSectorsLoading={sectorsQuery.isLoading}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onToggleItem={toggleItemExpanded}
            onUpdateItem={updateItem}
            onUpdateMaskedItem={updateMaskedItem}
            onUpdateItemType={updateItemType}
            onUpdateItemCatalog={updateItemCatalog}
            onQuickCatalogCreate={openQuickCatalogCreate}
            onQuickStockAdd={openQuickStockAdd}
          />
        ) : null}

        {activeStep === "review" ? (
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-7 py-5">
              <h2 className="text-base font-semibold text-foreground">
                Revisão do orçamento
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confira os dados principais antes de salvar.
              </p>
            </div>

            <div className="grid gap-6 p-7 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Proposta
                </p>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {selectedClient?.name ?? "Cliente pendente"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getVehicleLabel(selectedVehicle)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Validade: {form.validUntil || "Não informada"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Itens
                </p>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {validItemsCount}/{form.items.length} itens válidos
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedMechanic?.name ?? "Mecânico pendente"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Base comissão: {formatCurrency(totals.commissionBaseTotal)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}
	
	  {/* RIGHT */}
  <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total do orçamento
            </p>

            <h2 className="mt-1 font-mono text-3xl font-bold text-foreground">
              {formatCurrency(totals.total)}
            </h2>
          </div>

          <Badge
            variant={statusOption?.variant ?? "secondary"}
            className={statusOption?.className}
          >
            {statusOption?.label ?? form.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Itens válidos
          </span>

          <span className="font-semibold">
            {validItemsCount}/{form.items.length}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal
          </span>

          <span className="font-mono font-semibold">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Desconto
          </span>

          <span className="font-mono font-semibold text-amber-600">
            -{formatCurrency(totals.discountTotal)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Base comissão
          </span>

          <span className="font-mono font-semibold">
            {formatCurrency(totals.commissionBaseTotal)}
          </span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            Total
          </span>

          <span className="font-mono text-2xl font-bold">
            {formatCurrency(totals.total)}
          </span>
        </div>

	        <div className="space-y-3 pt-2">
	          <Button
	            type="button"
	            className="h-10 w-full px-5"
	            disabled={
	              isSaving ||
	              (activeStep === "client" && !canProceedFromClient) ||
	              (activeStep === "items" && !canProceedFromItems)
	            }
	            onClick={() => {
	              if (activeStep === "client") {
	                setActiveStep("items");
	                return;
	              }

	              if (activeStep === "items") {
	                setActiveStep("review");
	                return;
	              }

	              setIsObservationModalOpen(true);
	            }}
	          >
	            {isSaving
	              ? "Salvando..."
	              : activeStep === "client"
	                ? "Continuar para itens"
	                : activeStep === "items"
	                  ? "Continuar para salvar"
	                  : "Salvar orçamento"}
	          </Button>

	          {activeStep !== "client" ? (
	            <Button
	              type="button"
	              variant="outline"
	              className="h-10 w-full"
	              onClick={() =>
	                setActiveStep(activeStep === "review" ? "items" : "client")
	              }
	            >
	              Voltar
	            </Button>
	          ) : null}
	        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => router.push("/orcamentos")}
        >
          Cancelar
        </Button>
      </div>
    </section>
  </aside>
</div>
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
          ? quickDialogItemType === "SERVICE"
            ? "Cadastrar serviço"
            : "Cadastrar produto"
          : "Adicionar estoque"}
      </DialogTitle>
      <DialogDescription>
        {quickCatalogDialog?.mode === "create"
          ? quickDialogItemType === "SERVICE"
            ? "Crie o serviço e selecione-o automaticamente neste orçamento."
            : "Crie o produto e selecione-o automaticamente neste orçamento."
          : "Selecione um produto existente e informe a quantidade que entrou no estoque."}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {quickCatalogDialog?.mode === "create" ? (
        <>
          <div className="grid gap-2">
            <Label>
              {quickDialogItemType === "SERVICE" ? "Nome do serviço" : "Nome do produto"}
            </Label>
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
          <div
            className={
              quickDialogItemType === "PRODUCT"
                ? "grid gap-3 sm:grid-cols-3"
                : "grid gap-3 sm:grid-cols-2"
            }
          >
            {quickDialogItemType === "PRODUCT" ? (
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
            ) : null}
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
          {quickDialogItemType === "PRODUCT" ? (
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
          ) : null}
        </>
      ) : (
        <>
          <div className="grid gap-2">
            <Label>Produto existente</Label>
            <Select
              value={quickDialogCatalogItem?.id ?? ""}
              onValueChange={(value) =>
                setQuickCatalogDialog((prev) =>
                  prev?.mode === "stock"
                    ? { ...prev, catalogItemId: value }
                    : prev,
                )
              }
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {productCatalogItems.map((catalogItem) => (
                  <SelectItem key={catalogItem.id} value={catalogItem.id}>
                    #{catalogItem.code} {catalogItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">
              {quickDialogCatalogItem?.name ?? "Produto selecionado"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Estoque atual:{" "}
              {normalizeAmount(quickDialogCatalogItem?.stockCurrent ?? "0")}.
              Quantidade no orçamento: {normalizeAmount(quickDialogItem?.quantity ?? "0")}.
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
    </div>

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
      <Button
        type="button"
        disabled={isQuickCatalogSaving}
        onClick={() => quickCatalogMutation.mutate()}
      >
        {isQuickCatalogSaving
          ? "Salvando..."
          : quickCatalogDialog?.mode === "create"
            ? quickDialogItemType === "SERVICE"
              ? "Cadastrar serviço"
              : "Cadastrar produto"
            : "Adicionar estoque"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
<Modal
  isOpen={isObservationModalOpen}
  onRequestClose={() => setIsObservationModalOpen(false)}
  ariaHideApp={false}
  className="mx-auto mt-24 w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-border bg-card shadow-xl outline-none"
  overlayClassName="fixed inset-0 z-50 bg-black/50 px-4"
>
  <div className="border-b border-border px-6 py-5">
    <h2 className="text-lg font-semibold text-foreground">
      Deseja adicionar observações?
    </h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Você pode adicionar uma observação interna ou uma mensagem que aparecerá para o cliente.
    </p>
  </div>

  <div className="grid gap-5 p-6 md:grid-cols-2">
    <div className="grid gap-2">
      <Label>Observação interna</Label>
      <Textarea
        rows={8}
        value={form.notesInternal}
        onChange={onChange("notesInternal")}
        placeholder="Informações internas da oficina..."
      />
    </div>

    <div className="grid gap-2">
      <Label>Observação para o cliente</Label>
      <Textarea
        rows={8}
        value={form.notesClient}
        onChange={onChange("notesClient")}
        placeholder="Mensagem que será exibida para o cliente..."
      />
    </div>
  </div>

  <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-5 sm:flex-row sm:justify-end">
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setIsObservationModalOpen(false);
        submitEstimate();
      }}
      disabled={isSaving}
    >
      Salvar sem observação
    </Button>

    <Button
      type="button"
      onClick={() => {
        setIsObservationModalOpen(false);
        submitEstimate();
      }}
      disabled={isSaving}
    >
      {isSaving ? "Salvando..." : "Salvar orçamento"}
    </Button>
  </div>
</Modal>
    </form>
  );
}
