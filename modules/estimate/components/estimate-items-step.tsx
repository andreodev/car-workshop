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
import type { EstimateItemFormValues } from "../types/estimate.types";
import {
  calculateDiscountValue,
  formatCurrency,
  getCommissionBaseValue,
  normalizeAmount,
} from "../utils/estimate-form-utils";

type EstimateItemsStepProps = {
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

type EstimateItemCardProps = Omit<
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

function EstimateItemCard({
  item,
  index,
  catalogItems,
  mechanics,
  sectors,
  expandedItemIds,
  isCatalogLoading,
  isMechanicsLoading,
  isSectorsLoading,
  onRemoveItem,
  onToggleItem,
  onUpdateItem,
  onUpdateMaskedItem,
  onUpdateItemType,
  onUpdateItemCatalog,
  onQuickCatalogCreate,
  onQuickStockAdd,
}: EstimateItemCardProps) {
  const quantity = normalizeAmount(item.quantity);
  const unitPrice = normalizeAmount(item.unitPrice);
  const discountPercent = normalizeAmount(item.discount);
  const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
  const lineTotal = Math.max(quantity * unitPrice - discount, 0);
  const commissionBase = getCommissionBaseValue(item, lineTotal);
  const selectedCatalogItem = catalogItems.find(
    (catalogItem) => catalogItem.id === item.catalogItemId,
  );
  const selectedStock = normalizeAmount(selectedCatalogItem?.stockCurrent ?? "0");
  const hasInsufficientStock =
    item.type === "PRODUCT" && Boolean(selectedCatalogItem) && quantity > selectedStock;
  const isExpanded = expandedItemIds.has(item.id);
  const isService = item.type === "SERVICE";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-3 transition hover:bg-muted/40">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-4 text-left"
          onClick={() => onToggleItem(item.id)}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Item {index + 1}
              </span>
              <Badge variant="outline">{isService ? "Serviço" : "Produto"}</Badge>
              {hasInsufficientStock ? (
                <Badge variant="destructive">Estoque baixo</Badge>
              ) : null}
            </div>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.description.toLocaleUpperCase() || "Nenhuma descrição"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <span className="font-mono text-sm font-semibold">
              {formatCurrency(lineTotal)}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onRemoveItem(item.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {isExpanded ? (
        <div className="border-t border-border p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
            <section className="rounded-lg border border-border bg-card/60 p-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Identificação do item
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isService ? "Serviço" : "Produto"} #{index + 1}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
                    <Button
                      type="button"
                      variant={isService ? "default" : "ghost"}
                      className="h-8 px-3 text-xs"
                      onClick={() => onUpdateItemType(item.id, "SERVICE")}
                    >
                      Serviço
                    </Button>
                    <Button
                      type="button"
                      variant={!isService ? "default" : "ghost"}
                      className="h-8 px-3 text-xs"
                      onClick={() => onUpdateItemType(item.id, "PRODUCT")}
                    >
                      Produto
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="grid gap-2">
                    <Label>
                      {isService ? "Nome do serviço" : "Nome do produto"}
                    </Label>
                    <Input
                      className="h-11"
                      value={item.description}
                      onChange={(event) =>
                        onUpdateItem(
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
                        onUpdateMaskedItem(item.id, "quantity", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Catálogo opcional</Label>
                  <CatalogItemCombobox
                    items={catalogItems}
                    value={item.catalogItemId}
                    type={item.type}
                    loading={isCatalogLoading}
                    placeholder="Selecione"
                    manualLabel="Sem vínculo com catálogo"
                    onChange={(value) => onUpdateItemCatalog(item.id, value)}
                  />

                  <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-xs">
                      {item.type === "PRODUCT" && selectedCatalogItem ? (
                        <span
                          className={
                            hasInsufficientStock
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          Estoque: {selectedStock}. Solicitado: {quantity || 0}.
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {selectedCatalogItem
                            ? `#${selectedCatalogItem.code} ${selectedCatalogItem.name}`
                            : "Item livre"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8"
                        onClick={() => onQuickCatalogCreate(item.id)}
                      >
                        {item.type === "PRODUCT"
                          ? "Cadastrar produto"
                          : "Cadastrar serviço"}
                      </Button>
                      {item.type === "PRODUCT" ? (
                        <Button
                          type="button"
                          variant={hasInsufficientStock ? "secondary" : "outline"}
                          className="h-8"
                          onClick={() => onQuickStockAdd(item.id, selectedCatalogItem)}
                        >
                          Adicionar estoque
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card/60 p-4">
              <div className="space-y-4">
                {isService ? (
                  <div className="grid gap-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Responsáveis
                    </h3>

                    <div className="grid gap-2">
                      <Label>Mecânico do item</Label>
                      <Select
                        value={item.mechanicId}
                        onValueChange={(value) =>
                          onUpdateItem(item.id, "mechanicId", value)
                        }
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue
                            placeholder={
                              isMechanicsLoading ? "Carregando..." : "Selecione"
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
                          onUpdateItem(item.id, "sectorId", value)
                        }
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue
                            placeholder={
                              isSectorsLoading ? "Carregando..." : "Selecione"
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
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Precificação
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Valor unitário</Label>
                      <Input
                        className="h-11"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(event) =>
                          onUpdateMaskedItem(
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
                          onUpdateMaskedItem(
                            item.id,
                            "discount",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  {isService ? (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Label>Base comissão</Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Valor usado para cálculo da comissão.
                          </p>
                        </div>
                        <Calculator className="size-4 text-muted-foreground" />
                      </div>

                      <Input
                        className="mt-3 h-10 bg-background"
                        inputMode="decimal"
                        value={item.commissionBase}
                        onChange={(event) =>
                          onUpdateMaskedItem(
                            item.id,
                            "commissionBase",
                            event.target.value,
                          )
                        }
                        placeholder={formatCurrency(lineTotal)}
                      />
                    </div>
                  ) : null}

                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Total do item</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>

                    {isService ? (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Calculator className="size-4" />
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
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
