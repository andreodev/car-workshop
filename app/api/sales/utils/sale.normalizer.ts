import { Prisma, type SalePaymentMethod, type SaleStatus } from "@prisma/client";

export const saleStatuses = ["CONCLUIDA", "CANCELADA"] as const;
export const salePaymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "BOLETO",
  "OUTRO",
] as const;
export const pdvPaymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
] as const;

type SaleStatusValue = (typeof saleStatuses)[number];
type SalePaymentMethodValue = (typeof salePaymentMethods)[number];
export type PdvPaymentMethod = (typeof pdvPaymentMethods)[number];

export type ParsedPayment = {
  paymentMethod: PdvPaymentMethod;
  amount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  installments: number;
};

export class StockError extends Error {}

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

export function normalizeNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeMoney(value: unknown) {
  const parsed = normalizeNumber(value);

  if (parsed === null || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

export function normalizeSalePaymentMethod(value: unknown) {
  const normalized = normalizeString(value) ?? "DINHEIRO";

  if (!salePaymentMethods.includes(normalized as SalePaymentMethodValue)) {
    return null;
  }

  return normalized as SalePaymentMethod;
}

export function normalizeStatus(value: string | null) {
  if (!value || value === "TODOS") {
    return null;
  }

  if (!saleStatuses.includes(value as SaleStatusValue)) {
    return null;
  }

  return value as SaleStatus;
}

export function normalizeDateStart(value: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDateEnd(value: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T23:59:59.999`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatStock(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
    : "0";
}

function isPdvPaymentMethod(method: unknown): method is PdvPaymentMethod {
  return (
    typeof method === "string" &&
    pdvPaymentMethods.includes(method as PdvPaymentMethod)
  );
}

export function normalizePdvPaymentMethod(value: unknown): PdvPaymentMethod | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  if (!isPdvPaymentMethod(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeDecimal(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Prisma.Decimal(parsed);
}

export function normalizePayments(value: unknown): ParsedPayment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const payments: ParsedPayment[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const paymentMethod = normalizePdvPaymentMethod(record.paymentMethod);

    if (!paymentMethod) {
      return null;
    }

    const amount = normalizeDecimal(record.amount);
    const feeAmount = normalizeDecimal(record.feeAmount ?? 0);
    const installmentsValue = normalizeNumber(record.installments ?? 1);
    const installments =
      paymentMethod === "CARTAO_CREDITO"
        ? Math.min(Math.max(Math.trunc(installmentsValue ?? 1), 1), 12)
        : 1;

    if (!amount || amount.lessThanOrEqualTo(0)) {
      return null;
    }

    if (!feeAmount || feeAmount.lessThan(0)) {
      return null;
    }

    payments.push({
      paymentMethod,
      amount,
      feeAmount,
      installments,
    });
  }

  return payments;
}

export function normalizePaymentsFromPayload(
  payload: Record<string, unknown>,
  fallbackTotal: Prisma.Decimal,
) {
  const payments = normalizePayments(payload.payments);

  if (payments?.length) {
    return payments;
  }

  const paymentMethod = normalizePdvPaymentMethod(payload.paymentMethod);

  if (!paymentMethod) {
    return null;
  }

  return [
    {
      paymentMethod,
      amount: fallbackTotal,
      feeAmount: new Prisma.Decimal(0),
      installments: 1,
    },
  ];
}

export function sumPaymentAmounts(payments: ParsedPayment[]) {
  return payments.reduce(
    (acc, payment) => acc.plus(payment.amount),
    new Prisma.Decimal(0),
  );
}

export function sumPaymentFees(payments: ParsedPayment[]) {
  return payments.reduce(
    (acc, payment) => acc.plus(payment.feeAmount),
    new Prisma.Decimal(0),
  );
}

export function getNextWeeklyPaymentDate() {
  const date = new Date();
  const today = date.getDay();
  const friday = 5;
  const daysUntilFriday = (friday - today + 7) % 7 || 7;

  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(0, 0, 0, 0);

  return date;
}
