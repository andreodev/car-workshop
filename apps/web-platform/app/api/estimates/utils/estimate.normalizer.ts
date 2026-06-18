import { Prisma } from "@prisma/client";

export const estimateStatuses = [
  "RASCUNHO",
  "ENVIADO",
  "APROVADO",
  "REJEITADO",
  "CONVERTIDO",
  "CANCELADO",
] as const;

export type EstimateStatusValue = (typeof estimateStatuses)[number];

export const estimateItemTypes = ["SERVICE", "PRODUCT"] as const;

export type EstimateItemTypeValue = (typeof estimateItemTypes)[number];

export type ParsedEstimateItems = {
  items: Array<{
    type: EstimateItemTypeValue;
    catalogItemId: string | null;
    mechanicId: string | null;
    sectorId: string | null;
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    commissionBase: Prisma.Decimal | null;
  }>;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  total: Prisma.Decimal;
};

export function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function parseEstimateStatus(value: unknown) {
  const status = normalizeString(value) ?? "RASCUNHO";

  if (!estimateStatuses.includes(status as EstimateStatusValue)) {
    return { error: "Status do orçamento inválido." };
  }

  return { value: status as EstimateStatusValue };
}

export function parseDecimal(value: unknown, fieldLabel: string) {
  const normalized = typeof value === "string" ? value.replace(",", ".") : String(value ?? "");

  if (!normalized) {
    return { value: new Prisma.Decimal(0) };
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: new Prisma.Decimal(parsed) };
}

export function parseDateTime(value: unknown, fieldLabel: string) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: parsed };
}

export function parsePositiveInt(value: unknown, fieldLabel: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = typeof value === "string" ? value.replace(",", ".") : String(value);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: Math.trunc(parsed) };
}

export function parseEstimateItems(payload: unknown) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: "Informe ao menos um item." };
  }

  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  const items: ParsedEstimateItems["items"] = [];

  for (const rawItem of payload) {
    if (!rawItem || typeof rawItem !== "object") {
      return { error: "Item inválido." };
    }

    const item = rawItem as Record<string, unknown>;
    const type = normalizeString(item.type) ?? "SERVICE";

    if (!estimateItemTypes.includes(type as EstimateItemTypeValue)) {
      return { error: "Tipo do item inválido." };
    }

    const catalogItemId = normalizeString(item.catalogItemId);
    const mechanicId = normalizeString(item.mechanicId);
    const sectorId = normalizeString(item.sectorId);
    const description = normalizeString(item.description);

    if (!description) {
      return { error: "Descrição do item é obrigatória." };
    }

    const quantityParsed = parsePositiveInt(item.quantity, "Quantidade");

    if (quantityParsed?.error) {
      return { error: quantityParsed.error };
    }

    const quantity = quantityParsed?.value ?? 0;

    if (quantity <= 0) {
      return { error: "Quantidade deve ser maior que zero." };
    }

    const unitPriceParsed = parseDecimal(item.unitPrice, "Valor unitario");

    if ("error" in unitPriceParsed) {
      return { error: unitPriceParsed.error };
    }

    const discountParsed = parseDecimal(item.discount, "Desconto");

    if ("error" in discountParsed) {
      return { error: discountParsed.error };
    }

    const unitPrice = unitPriceParsed.value;
    const discount = discountParsed.value;
    const lineSubtotal = unitPrice.mul(new Prisma.Decimal(quantity));
    let lineTotal = lineSubtotal.minus(discount);

    if (lineTotal.lessThan(0)) {
      lineTotal = new Prisma.Decimal(0);
    }

    const rawCommissionBase =
      item.commissionBase === null || item.commissionBase === undefined
        ? null
        : String(item.commissionBase);
    const hasCommissionBase = rawCommissionBase !== null && rawCommissionBase.trim() !== "";
    const commissionBaseParsed = hasCommissionBase
      ? parseDecimal(item.commissionBase, "Base de comissão")
      : null;

    if (commissionBaseParsed && "error" in commissionBaseParsed) {
      return { error: commissionBaseParsed.error };
    }

    const commissionBase = hasCommissionBase
      ? commissionBaseParsed?.value ?? new Prisma.Decimal(0)
      : type === "SERVICE"
        ? lineTotal
        : new Prisma.Decimal(0);

    if (commissionBase.greaterThan(lineTotal)) {
      return { error: "Base de comissão não pode ser maior que o total do item." };
    }

    subtotal = subtotal.add(lineSubtotal);
    discountTotal = discountTotal.add(discount);
    items.push({
      type: type as EstimateItemTypeValue,
      catalogItemId,
      mechanicId,
      sectorId,
      description,
      quantity,
      unitPrice,
      discount,
      total: lineTotal,
      commissionBase,
    });
  }

  let total = subtotal.minus(discountTotal);

  if (total.lessThan(0)) {
    total = new Prisma.Decimal(0);
  }

  return { items, subtotal, discountTotal, total };
}

export function toEstimateItemCreateInput(
  items: ParsedEstimateItems["items"],
  tenantId: string
) {
  return items.map((item) => ({
    tenantId,
    catalogItemId: item.catalogItemId,
    mechanicId: item.mechanicId,
    sectorId: item.sectorId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount,
    total: item.total,
    commissionBase: item.commissionBase,
  }));
}
