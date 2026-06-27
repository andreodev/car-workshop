import type {
  Estimate,
  EstimateFormValues,
  EstimateItemFormValues,
} from "../types/estimate.types";
import { formatAmountInput } from "./estimate-input-masks";

export function createEmptyEstimateItem(): EstimateItemFormValues {
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
    commissionValue: "",
  };
}

export const emptyEstimateForm: EstimateFormValues = {
  clientId: "",
  vehicleId: "",
  responsible: "",
  validUntil: "",
  status: "RASCUNHO",
  type: "SIMPLES",
  notesInternal: "",
  notesClient: "",
  items: [createEmptyEstimateItem()],
};

export function toInputDate(value: string | null) {
  if (!value) {
    return "";
  }

  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (isoDate) return isoDate;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA");
}

export function dateInputToUtcEndOfDay(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date(value).toISOString();
  }

  const [, year, month, day] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999),
  ).toISOString();
}

export function normalizeAmount(value: string) {
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDiscountValue(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
) {
  const subtotal = quantity * unitPrice;
  return roundCurrency(subtotal * (discountPercent / 100));
}

export function calculateDiscountPercent(
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



export function getCommissionBaseValue(
  item: EstimateItemFormValues,
  lineTotal: number,
) {
  const rawCommissionBase = item.commissionBase.trim();

  if (rawCommissionBase) {
    return normalizeAmount(rawCommissionBase);
  }

  return item.type === "SERVICE" ? lineTotal : 0;
}

export function getCommissionValue(item: EstimateItemFormValues) {
  const rawCommissionValue = item.commissionValue.trim();

  return rawCommissionValue ? normalizeAmount(rawCommissionValue) : null;
}

export function getEstimateItemValidationError(
  item: EstimateItemFormValues,
  index: number,
) {
  const itemLabel = `Item ${index + 1}`;
  const quantity = normalizeAmount(item.quantity);
  const unitPrice = normalizeAmount(item.unitPrice);
  const discountPercent = normalizeAmount(item.discount);
  const discount = calculateDiscountValue(quantity, unitPrice, discountPercent);
  const lineTotal = Math.max(quantity * unitPrice - discount, 0);
  const commissionBase = getCommissionBaseValue(item, lineTotal);
  const commissionValue = getCommissionValue(item);
  const isService = item.type === "SERVICE";

  if (!item.description.trim()) {
    return `${itemLabel}: informe a descrição.`;
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
    return `${itemLabel}: informe um valor unitário maior que zero.`;
  }

  if (discountPercent < 0 || discountPercent > 100) {
    return `${itemLabel}: desconto deve ficar entre 0% e 100%.`;
  }

  if (isService && commissionBase < 0) {
    return `${itemLabel}: base de comissão não pode ser negativa.`;
  }

  if (isService && commissionBase > lineTotal) {
    return `${itemLabel}: base de comissão não pode ser maior que o total do item.`;
  }

  if (isService && commissionValue !== null && commissionValue > lineTotal) {
    return `${itemLabel}: comissão fixa não pode ser maior que o total do item.`;
  }

  return null;
}

export function getVehicleLabel(
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

export function mapEstimateToForm(estimate: Estimate): EstimateFormValues {
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
            commissionValue:
              item.commissionValue === null
                ? ""
                : formatAmountInput(item.commissionValue),
          }))
        : [createEmptyEstimateItem()],
  };
}
