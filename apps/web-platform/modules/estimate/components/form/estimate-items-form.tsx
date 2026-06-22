"use client";

import { Calculator, ChevronDown, ClipboardList, Plus, Trash2 } from "lucide-react";

import { CatalogItemCombobox } from "@/app/(app)/_components/catalog-item-combobox";
import type { Mechanic } from "@/app/(app)/mecanicos/types";
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
import { cn } from "@/lib/utils";
import type { CatalogItem, Sector } from "@/modules/pdv/types/pdv.types";

import { formatCurrency } from "@/lib/finance/formatCurrency";
import type { EstimateItemFormValues } from "../../types/estimate.types";
import { calculateDiscountValue, getCommissionBaseValue, normalizeAmount } from "../../utils/estimate-form-utils";
import { EstimateItemCard } from "./estimate-item-card";

export interface EstimateItemsStepProps  {
  items: EstimateItemFormValues[];
  catalogItems: CatalogItem[];
  mechanics: Mechanic[];
  sectors: Sector[];
  expandedItemIds: Set<string>;
  isCatalogLoading: boolean;
  isMechanicsLoading: boolean;
  isSectorsLoading: boolean;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onToggleItem: (itemId: string) => void;
  onUpdateItem: (
    itemId: string,
    field: keyof EstimateItemFormValues,
    value: string,
  ) => void;
  onUpdateMaskedItem: (
    itemId: string,
    field: keyof EstimateItemFormValues,
    value: string,
  ) => void;
  onUpdateItemType: (
    itemId: string,
    type: EstimateItemFormValues["type"],
  ) => void;
  onUpdateItemCatalog: (itemId: string, catalogItemId: string) => void;
  onQuickCatalogCreate: (itemId: string) => void;
  onQuickStockAdd: (itemId: string, catalogItem: CatalogItem | undefined) => void;
};

export type EstimateItemCardProps = Omit<
  EstimateItemsStepProps,
  "items" | "onAddItem"
> & {
  item: EstimateItemFormValues;
  index: number;
};

export function EstimateItemsStep({
  items,
  catalogItems,
  mechanics,
  sectors,
  expandedItemIds,
  isCatalogLoading,
  isMechanicsLoading,
  isSectorsLoading,
  onAddItem,
  onRemoveItem,
  onToggleItem,
  onUpdateItem,
  onUpdateMaskedItem,
  onUpdateItemType,
  onUpdateItemCatalog,
  onQuickCatalogCreate,
  onQuickStockAdd,
}: EstimateItemsStepProps) {
  return (
    <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Itens do orçamento
            </h2>
          </div>

          <Button type="button" className="h-10 gap-2" onClick={onAddItem}>
            <Plus className="size-4" />
            Adicionar item
          </Button>
        </div>

        <div className="space-y-3 p-4">
          {items.map((item, index) => (
            <EstimateItemCard
              key={item.id}
              item={item}
              index={index}
              catalogItems={catalogItems}
              mechanics={mechanics}
              sectors={sectors}
              expandedItemIds={expandedItemIds}
              isCatalogLoading={isCatalogLoading}
              isMechanicsLoading={isMechanicsLoading}
              isSectorsLoading={isSectorsLoading}
              onRemoveItem={onRemoveItem}
              onToggleItem={onToggleItem}
              onUpdateItem={onUpdateItem}
              onUpdateMaskedItem={onUpdateMaskedItem}
              onUpdateItemType={onUpdateItemType}
              onUpdateItemCatalog={onUpdateItemCatalog}
              onQuickCatalogCreate={onQuickCatalogCreate}
              onQuickStockAdd={onQuickStockAdd}
            />
          ))}
        </div>
      </section>
    </div>
  );
}


