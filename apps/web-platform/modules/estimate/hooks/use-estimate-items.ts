import { useState } from "react";

import type {
  EstimateFormValues,
  EstimateItemFormValues,
} from "../types/estimate.types";
import type { CatalogItem } from "@/modules/pdv/types/pdv.types";

import {
  createEmptyEstimateItem,
  getEstimateItemValidationError,
} from "../utils/estimate-form-utils";
import {
  formatAmountInput,
  maskEstimateItemField,
} from "../utils/estimate-input-masks";

type UseEstimateItemsParams = {
  form: EstimateFormValues;
  setForm: React.Dispatch<React.SetStateAction<EstimateFormValues>>;
  catalogItems: CatalogItem[];
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
  }) => void;
};

export function useEstimateItems({
  form,
  setForm,
  catalogItems,
  toast,
}: UseEstimateItemsParams) {
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    () => new Set(form.items[0]?.id ? [form.items[0].id] : []),
  );

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
    const lastItem = form.items[form.items.length - 1];

    if (lastItem) {
      const itemError = getEstimateItemValidationError(
        lastItem,
        form.items.length - 1,
      );

      if (itemError) {
        toast({
          title: "Preencha o item atual",
          description: itemError,
          variant: "destructive",
        });

        setExpandedItemIds((prev) => new Set([...prev, lastItem.id]));
        return;
      }
    }

    const nextItem = createEmptyEstimateItem();

    setForm((prev) => ({
      ...prev,
      items: [...prev.items, nextItem],
    }));

    setExpandedItemIds((prev) => new Set([...prev, nextItem.id]));
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

  return {
    expandedItemIds,
    updateItem,
    updateMaskedItem,
    updateItemType,
    updateItemCatalog,
    addItem,
    removeItem,
    toggleItemExpanded,
  };
}