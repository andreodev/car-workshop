export type CatalogItemType = "PRODUTO" | "SERVICO";

export type CatalogItem = {
  id: string;
  code: number;
  type: CatalogItemType;
  name: string;
  sku: string | null;
  unitPrice: string;
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
  unitPrice: string;
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

export type SaleListResponse = {
  items: Sale[];
  total: number;
  page: number;
  pageSize: number;
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
  notes: string | null;
  items: SalePayloadItem[];
};
