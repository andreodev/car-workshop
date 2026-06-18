import { Prisma, type CatalogItemType } from "@prisma/client";

const catalogItemTypes = ["PRODUTO", "SERVICO"] as const;

type CatalogItemTypeValue = (typeof catalogItemTypes)[number];

const decimalFields = [
  "stockCurrent",
  "stockMinimum",
  "stockMaximum",
  "tablePrice",
  "supplierDiscountPercent",
  "purchasePrice",
  "profitPercent",
  "salePrice",
  "taxCommercialQuantity",
  "taxCommercialUnitValue",
  "taxTribQuantity",
  "taxTribUnitValue",
  "taxInsuranceTotal",
  "taxDiscount",
  "taxFreightTotal",
  "taxOtherExpenses",
  "taxGrossTotal",
  "taxFederalApproxPercent",
  "taxStateApproxPercent",
  "ipiSealQuantity",
  "ipiBase",
  "ipiRate",
  "ipiUnitValue",
  "ipiValue",
  "icmsBase",
  "icmsRate",
  "icmsValue",
  "pisBase",
  "pisRate",
  "pisValue",
  "cofinsBase",
  "cofinsRate",
  "cofinsValue",
  "importBase",
  "importExpenses",
  "importIof",
  "importValue",
  "fuelGlpPercent",
  "fuelNationalGasPercent",
  "fuelImportedGasPercent",
  "fuelCideBase",
  "fuelCideRate",
  "fuelCideValue",
  "ibsUfRate",
  "ibsMunicipalRate",
  "cbsRate",
  "ibsValue",
  "cbsValue",
] as const;

const textFields = [
  "sku",
  "barcode",
  "category",
  "unit",
  "manufacturerBrand",
  "location",
  "originalCode",
  "manufacturerCode",
  "sectorId",
  "applicationDescription",
  "taxCeanTrib",
  "taxNcm",
  "taxCest",
  "taxCfop",
  "taxCommercialUnit",
  "taxTribUnit",
  "taxExTipi",
  "taxScaleIndicator",
  "taxManufacturerCnpj",
  "taxBenefitCode",
  "taxPurchaseOrder",
  "taxPurchaseOrderItem",
  "taxFciControlNumber",
  "ipiTaxSituation",
  "ipiClass",
  "ipiLegalCode",
  "ipiProducerCnpj",
  "ipiSealCode",
  "ipiCalculationType",
  "icmsTaxSituation",
  "icmsCalculationType",
  "icmsNotes",
  "pisTaxSituation",
  "pisCalculationType",
  "pisNotes",
  "cofinsTaxSituation",
  "cofinsCalculationType",
  "cofinsNotes",
  "importNotes",
  "fuelAnpCode",
  "fuelDescription",
  "fuelNotes",
  "ibsCbsCst",
  "ibsCbsClassification",
  "ibsCbsNotes",
  "notes",
] as const;

type DecimalField = (typeof decimalFields)[number];
type TextField = (typeof textFields)[number];

export function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMoney(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 10000) / 10000;
}

export function normalizeType(value: unknown) {
  const normalized = normalizeString(value) ?? "PRODUTO";

  if (!catalogItemTypes.includes(normalized as CatalogItemTypeValue)) {
    return null;
  }

  return normalized as CatalogItemType;
}

function normalizeDate(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return Prisma.JsonNull;
  }

  const items = value
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));

  return items.length > 0 ? items : Prisma.JsonNull;
}

function normalizeSupplierQuotes(value: unknown) {
  if (!Array.isArray(value)) {
    return Prisma.JsonNull;
  }

  const quotes = value
    .map((quote) => {
      if (!quote || typeof quote !== "object") {
        return null;
      }

      const source = quote as Record<string, unknown>;
      const supplierName = normalizeString(source.supplierName);
      const quotedAt = normalizeString(source.quotedAt);
      const quotedValue = normalizeMoney(source.quotedValue);
      const quantity = normalizeMoney(source.quantity);

      if (!supplierName && !quotedAt && quotedValue === null && quantity === null) {
        return null;
      }

      return {
        quotedAt,
        quotedValue,
        quantity,
        supplierName,
      };
    })
    .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote));

  return quotes.length > 0 ? quotes : Prisma.JsonNull;
}

export function buildCatalogItemData(payload: Record<string, unknown>) {
  const data: Prisma.CatalogItemUncheckedCreateInput = {
    type: normalizeType(payload.type) ?? "PRODUTO",
    name: normalizeString(payload.name) ?? "",
    unitPrice: normalizeMoney(payload.unitPrice) ?? 0,
    active: payload.active === false ? false : true,
  };

  textFields.forEach((field: TextField) => {
    data[field] = normalizeString(payload[field]) as never;
  });

  decimalFields.forEach((field: DecimalField) => {
    data[field] = normalizeMoney(payload[field]) as never;
  });

  data.expirationDate = normalizeDate(payload.expirationDate);
  data.substituteCodes = normalizeStringArray(payload.substituteCodes);
  data.supplierQuotes = normalizeSupplierQuotes(payload.supplierQuotes);
  data.salePrice = normalizeMoney(payload.salePrice) ?? data.unitPrice;
  data.unitPrice = data.salePrice ?? data.unitPrice;

  return data;
}
