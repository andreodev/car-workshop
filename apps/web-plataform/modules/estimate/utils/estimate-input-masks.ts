import type { EstimateItemFormValues } from "../types/estimate.types";

type DecimalMaskOptions = {
  decimalPlaces?: number;
  integerPlaces?: number;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskDecimalInput(
  value: string,
  { decimalPlaces = 2, integerPlaces = 8 }: DecimalMaskOptions = {},
) {
  const normalized = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [rawInteger = "", ...rawDecimals] = normalized.split(",");
  const integer = rawInteger.replace(/^0+(?=\d)/, "").slice(0, integerPlaces);
  const decimals = rawDecimals.join("").slice(0, decimalPlaces);

  if (normalized.includes(",")) {
    return `${integer || "0"},${decimals}`;
  }

  return integer;
}

export function maskQuantityInput(value: string) {
  return onlyDigits(value).slice(0, 5);
}

export function maskMoneyInput(value: string) {
  const digits = onlyDigits(value).slice(0, 10);

  if (!digits) {
    return "";
  }

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function maskPercentInput(value: string) {
  const masked = maskDecimalInput(value, { decimalPlaces: 2, integerPlaces: 3 });
  const parsed = Number(masked.replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return masked;
  }

  if (parsed > 100) {
    return "100";
  }

  return masked;
}

export function formatAmountInput(
  value: string | number | null | undefined,
  fractionDigits = 2,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function maskEstimateItemField(
  field: keyof EstimateItemFormValues,
  value: string,
) {
  if (field === "quantity") {
    return maskQuantityInput(value);
  }

  if (field === "unitPrice" || field === "commissionBase") {
    return maskMoneyInput(value);
  }

  if (field === "discount") {
    return maskPercentInput(value);
  }

  return value;
}
