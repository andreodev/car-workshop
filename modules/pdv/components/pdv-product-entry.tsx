import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, BarcodeScanIcon, Search01Icon } from "@hugeicons/core-free-icons";

import { formatCurrency, formatStock } from "../utils/pdv-sale-utils";
import type { PdvSaleController } from "../hooks/use-pdv-sale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PdvProductEntryProps = {
  controller: PdvSaleController;
};

export function PdvProductEntry({ controller }: PdvProductEntryProps) {
  const { refs, queries, state, actions, mutations } = controller;
  const { productInputRef, quantityInputRef, unitPriceInputRef } = refs;

  return (
    <form onSubmit={actions.addLine} className="border-b border-border bg-card px-4 py-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_128px_150px_128px_150px] lg:items-end">
        <div className="min-w-0 space-y-1">
          <Label>Produto</Label>
          <div className="relative flex">
            <Button
              type="button"
              className="h-11 rounded-r-none px-3"
              onClick={actions.addCatalogItem}
              disabled={mutations.createCatalogMutation.isPending}
              title="Cadastrar item rapido"
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
            </Button>
            <div className="relative flex-1">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={productInputRef}
                className="h-11 rounded-l-none pl-9 text-base"
                placeholder="Leia o codigo ou busque produto/servico"
                value={state.productSearch}
                onKeyDown={actions.handleProductSearchKeyDown}
                onFocus={() => actions.setProductListOpen(true)}
                onBlur={() => window.setTimeout(() => actions.setProductListOpen(false), 120)}
                onChange={(event) => {
                  actions.setProductSearch(event.target.value);
                  actions.setSelectedProduct(null);
                  actions.setProductHighlightIndex(0);
                  actions.setProductListOpen(true);
                }}
              />
            </div>
            {state.productListOpen && !state.selectedProduct ? (
              <div className="absolute left-10 right-0 top-12 z-30 rounded-md border bg-popover shadow-lg">
                {queries.productsQuery.data?.items.length ? (
                  queries.productsQuery.data.items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                        index === state.productHighlightIndex ? "bg-muted" : ""
                      }`}
                      onClick={() => actions.selectProduct(item)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.name}</span>
                        {item.type === "PRODUTO" && item.stockCurrent !== null ? (
                          <span className="block text-xs text-muted-foreground">
                            Estoque: {formatStock(item.stockCurrent)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </button>
                  ))
                ) : queries.productsQuery.isFetching ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Carregando produtos...</div>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                )}
              </div>
            ) : null}
          </div>
          {state.selectedProduct ? (
            <p className="truncate text-xs text-muted-foreground">
              Selecionado: <span className="font-medium text-foreground">{state.selectedProduct.name}</span>
              {" - "}
              {formatCurrency(state.selectedProduct.unitPrice)}
              {state.selectedProduct.type === "PRODUTO" && state.selectedProduct.stockCurrent !== null
                ? ` - Estoque: ${formatStock(state.selectedProduct.stockCurrent)}`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label>Qtde.</Label>
          <Input
            ref={quantityInputRef}
            value={state.quantity}
            inputMode="decimal"
            maxLength={10}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => actions.setQuantity(event.target.value)}
            className="h-11 min-w-0 text-right tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label>Unitario</Label>
          <Input
            ref={unitPriceInputRef}
            value={state.unitPrice}
            inputMode="decimal"
            maxLength={12}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => actions.setUnitPrice(event.target.value)}
            className="h-11 min-w-0 text-right tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label>Desc. %</Label>
          <Input
            value={state.discountPercent}
            inputMode="decimal"
            maxLength={6}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => actions.setDiscountPercent(event.target.value)}
            className="h-11 min-w-0 text-right tabular-nums"
          />
        </div>
        <Button type="submit" className="h-11 gap-2">
          <HugeiconsIcon icon={BarcodeScanIcon} strokeWidth={2.5} />
          Incluir
        </Button>
      </div>
    </form>
  );
}
