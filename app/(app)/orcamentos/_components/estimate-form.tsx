"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Trash2,
  UserCog,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "react-modal";

import { fetchClients } from "@/modules/client/api/client.service";
import { fetchMechanics } from "../../mecanicos/mechanic-api";
import { fetchCatalogItems, fetchSectors } from "@/modules/pdv/api/pdv.service";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { createEstimate, updateEstimate } from "../estimate-api";
import { estimateStatusOptions } from "../status";
import type {
  Estimate,
  EstimateFormValues,
  EstimateItemFormValues,
  EstimatePayload,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { vehiclesService } from "@/modules/vehicle/api/vehicle.service";
import {
  formatAmountInput,
  maskEstimateItemField,
} from "../estimate-input-masks";

const noSelection = "__none__";

function createEmptyItem(): EstimateItemFormValues {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `item-${Date.now()}-${Math.random()}`,
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
            type: item.catalogItem?.type === "PRODUTO" ? "PRODUCT" : "SERVICE",
            catalogItemId: item.catalogItemId ?? "",
            mechanicId: item.mechanicId ?? "",
            sectorId: item.sectorId ?? "",
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: formatAmountInput(item.unitPrice),
            discount: formatAmountInput(
              calculateDiscountPercent(
                Number(item.quantity),
                Number(item.unitPrice ?? 0),
                item.discount ?? "0",
              ),
            ),
            commissionBase:
              item.commissionBase === null
                ? ""
                : formatAmountInput(item.commissionBase),
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getCommissionBaseValue(item: EstimateItemFormValues, lineTotal: number) {
  const rawCommissionBase = item.commissionBase.trim();

  if (rawCommissionBase) {
    return normalizeAmount(rawCommissionBase);
  }

  return item.type === "SERVICE" ? lineTotal : 0;
}

function getVehicleLabel(
  vehicle?: {
    plate: string;
    brand?: string | null;
    model: string | null;
  } | null,
) {
  if (!vehicle) {
    return "Veículo não selecionado";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model]
    .filter(Boolean)
    .join(" - ");
}

type EstimateFormProps = {
  mode: "create" | "edit";
  initialData?: Estimate | null;
};

export function EstimateForm({ mode, initialData }: EstimateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EstimateFormValues>(() =>
    initialData ? mapEstimateToForm(initialData) : emptyForm,
  );
  const [localError, setLocalError] = useState<string | null>(null);
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
    queryFn: () => fetchCatalogItems({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });

  const catalogItems = catalogItemsQuery.data?.items ?? [];
  const mechanics = mechanicsQuery.data?.items ?? [];
  const sectors = sectorsQuery.data?.items ?? [];

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
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...createEmptyItem(),
        },
      ],
    }));
  }

  function removeItem(itemId: string) {
    setForm((prev) => {
      const nextItems = prev.items.filter((item) => item.id !== itemId);

      return {
        ...prev,
        items: nextItems.length > 0 ? nextItems : [createEmptyItem()],
      };
    });
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

    const invalidItem = form.items.find((item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      const discountPercent = normalizeAmount(item.discount);
      const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
      const lineTotal = Math.max(quantity * unitPrice - discount, 0);
      const commissionBase = getCommissionBaseValue(item, lineTotal);
      const isService = item.type === "SERVICE";

      return (
        !item.description.trim() ||
        (isService && !item.mechanicId) ||
        (isService && !item.sectorId) ||
        quantity <= 0 ||
        unitPrice <= 0 ||
        discountPercent < 0 ||
        discountPercent > 100 ||
        (isService && (commissionBase < 0 || commissionBase > lineTotal))
      );
    });

    if (invalidItem) {
      setLocalError(
        "Preencha os campos obrigatórios do item conforme o tipo selecionado.",
      );
      return;
    }

    const payload: EstimatePayload = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      responsible: responsibleValue.trim(),
      validUntil: form.validUntil
        ? new Date(`${form.validUntil}T23:59:59`).toISOString()
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
  const workflowSteps = [
    { label: "Cliente", done: Boolean(form.clientId && form.vehicleId) },
    { label: "Itens", done: validItemsCount > 0 },
    { label: "Salvar", done: false },
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

<section className="w-full border border-border bg-card p-4">
  <div className="flex w-full flex-col gap-3">
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${workflowProgress}%` }}
      />
    </div>

    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {workflowSteps.map((step) => {
        const StepIcon = step.done ? CheckCircle2 : Circle;

        return (
          <div
            key={step.label}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <StepIcon
              className={
                step.done
                  ? "size-3.5 text-emerald-600"
                  : "size-3.5 text-muted-foreground"
              }
            />

            <span className={step.done ? "font-medium text-foreground" : ""}>
              {step.label}
            </span>
          </div>
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

      <div className="grid flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
  {/* LEFT */}
  <aside className="space-y-5">
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

  </aside>

  {/* CENTER */}
  <div className="min-w-0 space-y-5">
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />

            <h2 className="text-sm font-semibold text-foreground">
              Itens do orçamento
            </h2>
          </div>
        </div>

        <Button
          type="button"
          className="h-10 gap-2"
          onClick={addItem}
        >
          <Plus className="size-4" />
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
            discountPercent,
          );

          const lineTotal = Math.max(
            quantity * unitPrice - discount,
            0,
          );
          const commissionBase = getCommissionBaseValue(item, lineTotal);

          const availableCatalogItems = catalogItems.filter(
            (catalogItem) =>
              item.type === "PRODUCT"
                ? catalogItem.type === "PRODUTO"
                : catalogItem.type === "SERVICO",
          );

          return (
            <details
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-border bg-background"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      Item {index + 1}
                    </span>

                    <Badge variant="outline">
                      {item.type === "PRODUCT"
                        ? "Produto"
                        : "Serviço"}
                    </Badge>
                  </div>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.description.toLocaleUpperCase() || "Nenhuma descrição"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-semibold">
                    {formatCurrency(lineTotal)}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => {
                      event.preventDefault();
                      removeItem(item.id);
                    }}
                  >
                    <Trash2 className="size-4" />
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
                          value as EstimateItemFormValues["type"],
                        )
                      }
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="SERVICE">
                          Serviço
                        </SelectItem>

                        <SelectItem value="PRODUCT">
                          Produto
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Catálogo opcional</Label>

                    <Select
                      value={item.catalogItemId || noSelection}
                      onValueChange={(value) =>
                        updateItemCatalog(
                          item.id,
                          value === noSelection ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue
                          placeholder={
                            catalogItemsQuery.isLoading
                              ? "Carregando..."
                              : "Selecione"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={noSelection}>
                          Sem vínculo com catálogo
                        </SelectItem>

                        {availableCatalogItems.map((catalogItem) => (
                          <SelectItem
                            key={catalogItem.id}
                            value={catalogItem.id}
                          >
                            #{catalogItem.code}{" "}
                            {catalogItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label>{item.type === "SERVICE" ? "Nome do serviço" : "Nome do produto"}</Label>

                    <Input
                      className="h-11"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "description",
                          event.target.value.toLocaleUpperCase(),
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
                        updateMaskedItem(
                          item.id,
                          "quantity",
                          event.target.value,
                        )
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
                        updateMaskedItem(
                          item.id,
                          "unitPrice",
                          event.target.value,
                        )
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
                        updateMaskedItem(
                          item.id,
                          "discount",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {item.type === "SERVICE" ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Base comissão</Label>

                        <Input
                          className="h-11"
                          inputMode="decimal"
                          value={item.commissionBase}
                          onChange={(event) =>
                            updateMaskedItem(
                              item.id,
                              "commissionBase",
                              event.target.value,
                            )
                          }
                          placeholder={formatCurrency(lineTotal)}
                        />
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm md:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Base comissionável</span>
                          <span className="font-mono font-semibold">
                            {formatCurrency(commissionBase)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  </div>

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

        <div className="pt-2">
          <Button
  type="button"
  className="h-10 px-5 w-full"
  disabled={isSaving}
  onClick={() => setIsObservationModalOpen(true)}
>
  {isSaving ? "Salvando..." : "Salvar orçamento"}
</Button>
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
