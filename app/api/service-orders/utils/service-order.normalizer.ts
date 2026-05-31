import { Prisma } from "@prisma/client";

export const serviceOrderStatuses = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
  "FINALIZADA",
  "CANCELADA",
] as const;

export type ServiceOrderStatusValue = (typeof serviceOrderStatuses)[number];

export const serviceOrderItemTypes = ["SERVICE", "PRODUCT"] as const;

export type ServiceOrderItemTypeValue = (typeof serviceOrderItemTypes)[number];

export type ParsedServiceOrderItems = {
  items: Array<{
    type: ServiceOrderItemTypeValue;
    catalogItemId: string | null;
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
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

export function parseServiceOrderStatus(value: unknown) {
  const status = normalizeString(value) ?? "ABERTA";

  if (!serviceOrderStatuses.includes(status as ServiceOrderStatusValue)) {
    return { error: "Status da ordem de serviço inválido." };
  }

  return { value: status as ServiceOrderStatusValue };
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
    return { error: `${fieldLabel} obrigatório.` };
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: parsed };
}

export function parseServiceOrderItems(payload: unknown) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: "Informe ao menos um item." };
  }

  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  const items: ParsedServiceOrderItems["items"] = [];

  for (const rawItem of payload) {
    if (!rawItem || typeof rawItem !== "object") {
      return { error: "Item inválido." };
    }

    const item = rawItem as Record<string, unknown>;
    const type = normalizeString(item.type) ?? "SERVICE";

    if (!serviceOrderItemTypes.includes(type as ServiceOrderItemTypeValue)) {
      return { error: "Tipo do item inválido." };
    }

    const catalogItemId = normalizeString(item.catalogItemId);
    const description = normalizeString(item.description);

    if (!description) {
      return { error: "Descrição do item é obrigatória." };
    }

    if (type === "PRODUCT" && !catalogItemId) {
      return { error: "Selecione um produto do catálogo para itens do tipo produto." };
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

    if (unitPriceParsed.error) {
      return { error: unitPriceParsed.error };
    }

    const discountParsed = parseDecimal(item.discount, "Desconto");

    if (discountParsed.error) {
      return { error: discountParsed.error };
    }

    const unitPrice = unitPriceParsed.value ?? new Prisma.Decimal(0);
    const discount = discountParsed.value ?? new Prisma.Decimal(0);
    const quantityDecimal = new Prisma.Decimal(quantity);
    const lineSubtotal = unitPrice.mul(quantityDecimal);
    let lineTotal = lineSubtotal.minus(discount);

    if (lineTotal.lessThan(0)) {
      lineTotal = new Prisma.Decimal(0);
    }

    subtotal = subtotal.add(lineSubtotal);
    discountTotal = discountTotal.add(discount);

    items.push({
      type: type as ServiceOrderItemTypeValue,
      catalogItemId,
      description,
      quantity,
      unitPrice,
      discount,
      total: lineTotal,
    });
  }

  let total = subtotal.minus(discountTotal);

  if (total.lessThan(0)) {
    total = new Prisma.Decimal(0);
  }

  return { items, subtotal, discountTotal, total };
}
