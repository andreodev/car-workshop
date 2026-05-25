import type { CatalogItem } from "../types";

export type ClientOption = {
  id: string;
  name: string;
};

export type SaleLine = {
  localId: string;
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discount: number;
  total: number;
};

export type SaleTotals = {
  subtotal: number;
  discount: number;
  total: number;
};

export function parseDecimal(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function formatStock(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function calculateLine(quantity: number, unitPrice: number, discountPercent: number) {
  const grossTotal = quantity * unitPrice;
  const discount = Math.round(grossTotal * (discountPercent / 100) * 100) / 100;
  const total = Math.round((grossTotal - discount) * 100) / 100;
  return { discount, total };
}

export function calculateTotals(lines: SaleLine[]): SaleTotals {
  return lines.reduce(
    (acc, line) => ({
      subtotal: acc.subtotal + line.quantity * line.unitPrice,
      discount: acc.discount + line.discount,
      total: acc.total + line.total,
    }),
    { subtotal: 0, discount: 0, total: 0 }
  );
}

export function createSaleLine(params: {
  product: CatalogItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}): SaleLine {
  const calculated = calculateLine(params.quantity, params.unitPrice, params.discountPercent);

  return {
    localId: crypto.randomUUID(),
    catalogItemId: params.product.id,
    description: params.product.name,
    quantity: Math.round(params.quantity * 1000) / 1000,
    unitPrice: Math.round(params.unitPrice * 100) / 100,
    discountPercent: Math.round(params.discountPercent * 100) / 100,
    ...calculated,
  };
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function getStockValidationMessage(
  product: CatalogItem,
  requestedQuantity: number,
  currentLines: SaleLine[]
) {
  if (product.type !== "PRODUTO") {
    return null;
  }

  const currentStock = Number(product.stockCurrent ?? 0);
  const availableLabel = formatStock(currentStock) ?? "0";
  const quantityAlreadyAdded = currentLines
    .filter((line) => line.catalogItemId === product.id)
    .reduce((total, line) => total + line.quantity, 0);
  const nextRequestedQuantity = quantityAlreadyAdded + requestedQuantity;

  if (!Number.isFinite(currentStock) || currentStock <= 0) {
    return `Produto ${product.name} sem estoque disponivel.`;
  }

  if (nextRequestedQuantity > currentStock) {
    return `Estoque insuficiente para ${product.name}. Disponivel: ${availableLabel}. Solicitado: ${formatStock(
      nextRequestedQuantity
    )}.`;
  }

  return null;
}
