import { Prisma } from "@prisma/client";

export const serviceOrderStatuses = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
  "FINALIZADA",
  "CANCELADA",
  "PAGA",
] as const;

export type ServiceOrderStatusValue = (typeof serviceOrderStatuses)[number];

const serviceOrderStatusAliases: Record<string, ServiceOrderStatusValue> = {
  CONCLUIDA: "FINALIZADA",
  CONCLUÍDA: "FINALIZADA",
  CONCLUIDO: "FINALIZADA",
  CONCLUÍDO: "FINALIZADA",
  FINALIZADO: "FINALIZADA",
};

export const serviceOrderItemTypes = ["SERVICE", "PRODUCT"] as const;

export type ServiceOrderItemTypeValue = (typeof serviceOrderItemTypes)[number];

export type ParsedServiceOrderItems = {
  items: Array<{
    type: ServiceOrderItemTypeValue;
    catalogItemId: string | null;
    mechanicId: string | null;
    sectorId: string | null;
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    commissionBase: Prisma.Decimal | null;
    commissionValue: Prisma.Decimal | null;
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
  const rawStatus = normalizeString(value) ?? "ABERTA";
  const status = serviceOrderStatusAliases[rawStatus] ?? rawStatus;

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
    const mechanicId = normalizeString(item.mechanicId);
    const sectorId = normalizeString(item.sectorId);
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

    const rawCommissionBase =
      item.commissionBase === null || item.commissionBase === undefined
        ? null
        : String(item.commissionBase);
    const rawCommissionValue =
      item.commissionValue === null || item.commissionValue === undefined
        ? null
        : String(item.commissionValue);
    const hasCommissionBase = rawCommissionBase !== null && rawCommissionBase.trim() !== "";
    const hasCommissionValue = rawCommissionValue !== null && rawCommissionValue.trim() !== "";
    const commissionBaseParsed = hasCommissionBase
      ? parseDecimal(item.commissionBase, "Base de comissão")
      : null;
    const commissionValueParsed = hasCommissionValue
      ? parseDecimal(item.commissionValue, "Comissão fixa")
      : null;

    if (commissionBaseParsed && "error" in commissionBaseParsed) {
      return { error: commissionBaseParsed.error };
    }

    if (commissionValueParsed && "error" in commissionValueParsed) {
      return { error: commissionValueParsed.error };
    }

    const commissionBase = hasCommissionBase
      ? commissionBaseParsed?.value ?? new Prisma.Decimal(0)
      : type === "SERVICE"
        ? lineTotal
        : new Prisma.Decimal(0);
    const commissionValue = hasCommissionValue
      ? commissionValueParsed?.value ?? new Prisma.Decimal(0)
      : null;

    if (commissionBase.greaterThan(lineTotal)) {
      return { error: "Base de comissão não pode ser maior que o total do item." };
    }

    if (commissionValue && commissionValue.greaterThan(lineTotal)) {
      return { error: "Comissão fixa não pode ser maior que o total do item." };
    }

    subtotal = subtotal.add(lineSubtotal);
    discountTotal = discountTotal.add(discount);

    items.push({
      type: type as ServiceOrderItemTypeValue,
      catalogItemId,
      mechanicId,
      sectorId,
      description,
      quantity,
      unitPrice,
      discount,
      total: lineTotal,
      commissionBase,
      commissionValue,
    });
  }

  let total = subtotal.minus(discountTotal);

  if (total.lessThan(0)) {
    total = new Prisma.Decimal(0);
  }

  return { items, subtotal, discountTotal, total };
}
