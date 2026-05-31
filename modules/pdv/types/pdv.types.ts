export type CatalogItemType = "PRODUTO" | "SERVICO";

export type SupplierQuoteFormValues = {
  quotedAt: string;
  quotedValue: string;
  quantity: string;
  supplierName: string;
};

export type CatalogItem = {
  id: string;
  code: number;
  type: CatalogItemType;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string | null;
  manufacturerBrand: string | null;
  location: string | null;
  originalCode: string | null;
  manufacturerCode: string | null;
  sectorId: string | null;
  expirationDate: string | null;
  stockCurrent: string | null;
  stockMinimum: string | null;
  stockMaximum: string | null;
  tablePrice: string | null;
  supplierDiscountPercent: string | null;
  purchasePrice: string | null;
  profitPercent: string | null;
  salePrice: string | null;
  unitPrice: string;
  applicationDescription: string | null;
  substituteCodes: unknown;
  supplierQuotes: unknown;
  taxCeanTrib: string | null;
  taxNcm: string | null;
  taxCest: string | null;
  taxCfop: string | null;
  taxCommercialUnit: string | null;
  taxCommercialQuantity: string | null;
  taxCommercialUnitValue: string | null;
  taxTribUnit: string | null;
  taxTribQuantity: string | null;
  taxTribUnitValue: string | null;
  taxInsuranceTotal: string | null;
  taxDiscount: string | null;
  taxFreightTotal: string | null;
  taxOtherExpenses: string | null;
  taxGrossTotal: string | null;
  taxExTipi: string | null;
  taxScaleIndicator: string | null;
  taxManufacturerCnpj: string | null;
  taxBenefitCode: string | null;
  taxPurchaseOrder: string | null;
  taxPurchaseOrderItem: string | null;
  taxFciControlNumber: string | null;
  taxFederalApproxPercent: string | null;
  taxStateApproxPercent: string | null;
  ipiTaxSituation: string | null;
  ipiClass: string | null;
  ipiLegalCode: string | null;
  ipiProducerCnpj: string | null;
  ipiSealCode: string | null;
  ipiSealQuantity: string | null;
  ipiCalculationType: string | null;
  ipiBase: string | null;
  ipiRate: string | null;
  ipiUnitValue: string | null;
  ipiValue: string | null;
  icmsTaxSituation: string | null;
  icmsCalculationType: string | null;
  icmsBase: string | null;
  icmsRate: string | null;
  icmsValue: string | null;
  icmsNotes: string | null;
  pisTaxSituation: string | null;
  pisCalculationType: string | null;
  pisBase: string | null;
  pisRate: string | null;
  pisValue: string | null;
  pisNotes: string | null;
  cofinsTaxSituation: string | null;
  cofinsCalculationType: string | null;
  cofinsBase: string | null;
  cofinsRate: string | null;
  cofinsValue: string | null;
  cofinsNotes: string | null;
  importBase: string | null;
  importExpenses: string | null;
  importIof: string | null;
  importValue: string | null;
  importNotes: string | null;
  fuelAnpCode: string | null;
  fuelDescription: string | null;
  fuelGlpPercent: string | null;
  fuelNationalGasPercent: string | null;
  fuelImportedGasPercent: string | null;
  fuelCideBase: string | null;
  fuelCideRate: string | null;
  fuelCideValue: string | null;
  fuelNotes: string | null;
  ibsCbsCst: string | null;
  ibsCbsClassification: string | null;
  ibsUfRate: string | null;
  ibsMunicipalRate: string | null;
  cbsRate: string | null;
  ibsValue: string | null;
  cbsValue: string | null;
  ibsCbsNotes: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogItemListResponse = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogItemFormValues = {
  name: string;
  type: CatalogItemType;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  manufacturerBrand: string;
  location: string;
  originalCode: string;
  manufacturerCode: string;
  sectorId: string;
  expirationDate: string;
  stockCurrent: string;
  stockMinimum: string;
  stockMaximum: string;
  tablePrice: string;
  supplierDiscountPercent: string;
  purchasePrice: string;
  profitPercent: string;
  salePrice: string;
  unitPrice: string;
  applicationDescription: string;
  substituteCodes: string[];
  supplierQuotes: SupplierQuoteFormValues[];
  taxCeanTrib: string;
  taxNcm: string;
  taxCest: string;
  taxCfop: string;
  taxCommercialUnit: string;
  taxCommercialQuantity: string;
  taxCommercialUnitValue: string;
  taxTribUnit: string;
  taxTribQuantity: string;
  taxTribUnitValue: string;
  taxInsuranceTotal: string;
  taxDiscount: string;
  taxFreightTotal: string;
  taxOtherExpenses: string;
  taxGrossTotal: string;
  taxExTipi: string;
  taxScaleIndicator: string;
  taxManufacturerCnpj: string;
  taxBenefitCode: string;
  taxPurchaseOrder: string;
  taxPurchaseOrderItem: string;
  taxFciControlNumber: string;
  taxFederalApproxPercent: string;
  taxStateApproxPercent: string;
  ipiTaxSituation: string;
  ipiClass: string;
  ipiLegalCode: string;
  ipiProducerCnpj: string;
  ipiSealCode: string;
  ipiSealQuantity: string;
  ipiCalculationType: string;
  ipiBase: string;
  ipiRate: string;
  ipiUnitValue: string;
  ipiValue: string;
  icmsTaxSituation: string;
  icmsCalculationType: string;
  icmsBase: string;
  icmsRate: string;
  icmsValue: string;
  icmsNotes: string;
  pisTaxSituation: string;
  pisCalculationType: string;
  pisBase: string;
  pisRate: string;
  pisValue: string;
  pisNotes: string;
  cofinsTaxSituation: string;
  cofinsCalculationType: string;
  cofinsBase: string;
  cofinsRate: string;
  cofinsValue: string;
  cofinsNotes: string;
  importBase: string;
  importExpenses: string;
  importIof: string;
  importValue: string;
  importNotes: string;
  fuelAnpCode: string;
  fuelDescription: string;
  fuelGlpPercent: string;
  fuelNationalGasPercent: string;
  fuelImportedGasPercent: string;
  fuelCideBase: string;
  fuelCideRate: string;
  fuelCideValue: string;
  fuelNotes: string;
  ibsCbsCst: string;
  ibsCbsClassification: string;
  ibsUfRate: string;
  ibsMunicipalRate: string;
  cbsRate: string;
  ibsValue: string;
  cbsValue: string;
  ibsCbsNotes: string;
  active: boolean;
  notes: string;
};

export type Sector = {
  id: string;
  code: number;
  name: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SectorListResponse = {
  items: Sector[];
  total: number;
  page: number;
  pageSize: number;
};

export type SectorFormValues = {
  name: string;
  active: boolean;
  notes: string;
};

export type SaleStatus = "CONCLUIDA" | "CANCELADA";

export type SalePaymentMethod =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "BOLETO"
  | "OUTRO";

export type SaleItem = {
  id: string;
  saleId: string;
  catalogItemId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: string;
  catalogItem: {
    id: string;
    code: number;
    name: string;
    type: CatalogItemType;
  } | null;
};

export type Sale = {
  id: string;
  code: number;
  status: SaleStatus;
  clientId: string | null;
  sectorId: string | null;
  responsible: string;
  sectorName: string | null;
  paymentMethod: SalePaymentMethod;
  notes: string | null;
  subtotal: string;
  discountTotal: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  } | null;
  sector: {
    id: string;
    name: string;
  } | null;
  items: SaleItem[];
};

export type ServiceOrderCompleted = {
  id: string;
  code: number;
  status: string;
  responsible: string;
  total: string | number;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  } | null;
  vehicle?: {
    id: string;
    plate: string;
    model: string;
  } | null;
  mechanic?: {
    id: string;
    name: string;
  } | null;
  financialAccount?: {
    id: string;
    code: number;
    status: string;
    amount: string | number;
    dueDate: string;
    paymentDate: string | null;
    paidAmount: string | number | null;
    paymentMethod: string | null;
  } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: string | number;
    discount: string | number;
    total: string | number;
  }>;
};

export type SaleListResponse = {
  items: Sale[];
  total: number;
  page: number;
  pageSize: number;
  serviceOrdersCompleted?: ServiceOrderCompleted[];
};

export type SalePayloadItem = {
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
};

export type SalePayload = {
  clientId: string | null;
  sectorId: string | null;
  responsible: string;
  paymentMethod: SalePaymentMethod;
  payments?: SalePaymentPayload[];
  notes: string | null;
  items: SalePayloadItem[];
};

export type SalePaymentPayload = {
  paymentMethod: SalePaymentMethod;
  amount: number;
  feeAmount: number;
};

export type ServiceOrderPdvResponse = {
  id: string;
  code: number;
  status: string;
  client?: {
    id: string;
    name: string;
  } | null;
  sector?: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    id: string;
    catalogItemId?: string | null;
    code?: number | string | null;
    name: string;
    type: CatalogItem["type"];
    catalogItem?: {
      id: string;
      name: string;
      type: CatalogItemType;
      stockCurrent: string | null;
    } | null;
    quantity: string | number;
    unitPrice: string | number;
    discount?: string | number | null;
    total: string | number;
    stockCurrent?: string | number | null;
  }>;
  subtotal?: string | number;
  discount?: string | number;
  total?: string | number;
};
