"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Modal from "react-modal";

import {
  addCatalogItemStock,
  createCatalogItem,
} from "@/modules/pdv/api/pdv.service";
import type {
  CatalogItem,
  CatalogItemListResponse,
} from "@/modules/pdv/types/pdv.types";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { createEstimate, updateEstimate } from "../api/estimate.service";
import { estimateStatusOptions } from "../utils/estimate-status";
import type {
  EstimateFormProps,
  EstimateFormValues,
  EstimateItemFormValues,
  EstimatePayload,
  QuickCatalogDialogState,
  QuickCatalogFormValues,
} from "../types/estimate.types";
import { EstimateItemsStep } from "./form/estimate-items-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormLoadingState } from "@/components/ui/form-loading-state";
import Header from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getCommissionBaseValue,
  getEstimateItemValidationError,
  getVehicleLabel,
  mapEstimateToForm,
  normalizeAmount,
} from "../utils/estimate-form-utils";
import { formatCurrency } from "@/lib/finance/formatCurrency";
import { EstimateClientForm } from "./form/estimate-client-form";
import { EstimateReviewForm } from "./form/estimate-review-form";
import WorkflowSteps from "./workflow-steps";
import { useEstimateWorkflow } from "../hooks/use-estimate-workflow";
import { useEstimateOptions } from "../hooks/use-estimate-options";
import { useEstimateItems } from "../hooks/use-estimate-items";
import { useEstimeQuickCatalog } from "../hooks/use-estimate-quick-catalog";
import { maskCurrencyInput } from "@/modules/pdv/utils/pdv-sale-utils";
import { QuickDialog } from "./form/estimate-quick-form";

const emptyQuickCatalogForm: QuickCatalogFormValues = {
  name: "",
  quantity: "1",
  unitPrice: "0",
  unit: "UN",
  stockMinimum: "0",
  notes: "",
};

export function EstimateForm({ mode, initialData }: EstimateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialForm = useMemo(
    () => (initialData ? mapEstimateToForm(initialData) : emptyEstimateForm),
    [initialData],
  );
  const [form, setForm] = useState<EstimateFormValues>(initialForm);
  const [quickCatalogDialog, setQuickCatalogDialog] =
    useState<QuickCatalogDialogState>(null);
  const [quickCatalogForm, setQuickCatalogForm] =
    useState<QuickCatalogFormValues>(emptyQuickCatalogForm);
  const sessionQuery = useAuthSession();
  const sessionName =
    sessionQuery.data?.user?.name ?? sessionQuery.data?.user?.email ?? "";
  const responsibleValue = sessionName || "";
  const { toast } = useToast();

  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [shouldSubmitAfterObservation, setShouldSubmitAfterObservation] =
    useState(false);

  const {
    activeStep,
    setActiveStep,
    workflowSteps,
    workflowProgress,
    canProceedFromClient,
    canProceedFromItems,
  } = useEstimateWorkflow(form);

  const {
    clientsQuery,
    vehiclesQuery,
    mechanicsQuery,
    sectorsQuery,
    catalogItemsQuery,

    catalogItems,
    mechanics,
    sectors,

    availableVehicles,
    selectedClient,
    selectedVehicle,
    selectedMechanic,

    isLoadingOptions,
  } = useEstimateOptions({
    mode,
    clientId: form.clientId,
    vehicleId: form.vehicleId,
    items: form.items,
  });

  const {
    expandedItemIds,
    updateItem,
    updateMaskedItem,
    updateItemType,
    updateItemCatalog,
    addItem,
    removeItem,
    toggleItemExpanded,
  } = useEstimateItems({
    form,
    setForm,
    catalogItems,
    toast,
  });

  const { mergeCatalogItemIntoCaches } = useEstimeQuickCatalog(catalogItems);

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
          stockCurrent:
            itemType === "PRODUCT" ? String(Math.max(quantity, 0)) : "",
          stockMinimum:
            itemType === "PRODUCT"
              ? String(normalizeAmount(quickCatalogForm.stockMinimum))
              : "",
          unit: quickCatalogForm.unit.trim() || "UN",
          sectorId:
            itemType === "SERVICE"
              ? (form.items.find(
                  (item) => item.id === quickCatalogDialog.itemId,
                )?.sectorId ?? "")
              : "",
          active: true,
        });
      }

      const formItem = form.items.find(
        (item) => item.id === quickCatalogDialog.itemId,
      );
      const catalogItemId =
        quickCatalogDialog.catalogItemId || formItem?.catalogItemId;

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

      if (
        quickCatalogDialog?.mode === "create" ||
        quickCatalogDialog?.mode === "stock"
      ) {
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
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o catálogo.";
      toast({
        title: "Erro no catálogo",
        description: message,
        variant: "destructive",
      });
    },
  });

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
          : "Não foi possível salvar o orçamento.";
      toast({
        title: "Erro ao salvar orçamento",
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
      const discount = calculateDiscountValue(
        quantity,
        unitPrice,
        discountPercent,
      );
      subtotal += quantity * unitPrice;
      discountTotal += discount;
    });

    const commissionBaseTotal = form.items.reduce((sum, item) => {
      const quantity = normalizeAmount(item.quantity);
      const unitPrice = normalizeAmount(item.unitPrice);
      const discountPercent = normalizeAmount(item.discount);
      const discount = calculateDiscountValue(
        quantity,
        unitPrice,
        discountPercent,
      );
      const lineTotal = Math.max(quantity * unitPrice - discount, 0);

      return item.type === "SERVICE"
        ? sum + getCommissionBaseValue(item, lineTotal)
        : sum;
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

  function openQuickStockAdd(
    itemId: string,
    catalogItem: CatalogItem | undefined,
  ) {
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
    event.preventDefault();

    if (!form.clientId) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione o cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!form.vehicleId) {
      toast({
        title: "Veículo obrigatório",
        description: "Selecione o veículo.",
        variant: "destructive",
      });
      return;
    }

    if (!responsibleValue.trim()) {
      toast({
        title: "Responsável obrigatório",
        description: "Responsável é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const itemError = form.items
      .map((item, index) => getEstimateItemValidationError(item, index))
      .find(Boolean);

    if (itemError) {
      toast({
        title: "Itens inválidos",
        description: itemError,
        variant: "destructive",
      });
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
        commissionBase:
          item.type === "SERVICE" && item.commissionBase.trim()
            ? normalizeAmount(item.commissionBase)
            : null,
        commissionValue:
          item.type === "SERVICE" && item.commissionValue.trim()
            ? normalizeAmount(item.commissionValue)
            : null,
      })),
    };

    mutation.mutate(payload);
  }

  const isSaving = mutation.isPending;

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
  const productCatalogItems = catalogItems.filter(
    (item) => item.type === "PRODUTO",
  );
  const isQuickCatalogSaving = quickCatalogMutation.isPending;

  if (isLoadingOptions) {
    return <FormLoadingState title="Carregando orçamento..." />;
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

      <WorkflowSteps
        workflowSteps={workflowSteps}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        workflowProgress={workflowProgress}
      />

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {activeStep === "client" ? (
          <EstimateClientForm
            form={form}
            setForm={setForm}
            clientsQuery={clientsQuery}
            vehiclesQuery={vehiclesQuery}
            availableVehicles={availableVehicles}
            getVehicleLabel={getVehicleLabel}
            onChange={onChange}
          />
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
          <EstimateReviewForm
            form={form}
            selectedClient={selectedClient}
            selectedVehicle={selectedVehicle}
            selectedMechanic={selectedMechanic}
            totals={totals}
          />
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
                <span className="text-muted-foreground">Itens válidos</span>

                <span className="font-semibold">
                  {validItemsCount}/{form.items.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>

                <span className="font-mono font-semibold">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>

                <span className="font-mono font-semibold text-amber-600">
                  -{formatCurrency(totals.discountTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base comissão</span>

                <span className="font-mono font-semibold">
                  {formatCurrency(totals.commissionBaseTotal)}
                </span>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>

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
                      setActiveStep(
                        activeStep === "review" ? "items" : "client",
                      )
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

      <QuickDialog
        emptyQuickCatalogForm={emptyEstimateForm}
        isQuickCatalogSaving={isQuickCatalogSaving}
        productCatalogItems={productCatalogItems}
        quickCatalogDialog={quickCatalogDialog}
        quickCatalogForm={quickCatalogForm}
        quickCatalogMutation={quickCatalogMutation}
        quickDialogCatalogItem={quickDialogCatalogItem}
        quickDialogItem={quickDialogItem}
        quickDialogItemType={quickDialogItemType}
        setQuickCatalogDialog={setQuickCatalogDialog}
        setQuickCatalogForm={setQuickCatalogForm}
      />
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
            Você pode adicionar uma observação interna ou uma mensagem que
            aparecerá para o cliente.
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
