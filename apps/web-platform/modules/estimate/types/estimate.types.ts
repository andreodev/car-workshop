export type EstimateFormStep = "client" | "items" | "review";

export type EstimateStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "APROVADO"
  | "REJEITADO"
  | "CONVERTIDO"
  | "CANCELADO";

export type EstimateVisibility = "ATIVOS" | "ARQUIVADOS" | "TODOS";

export type EstimateItem = {
  id: string;
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  commissionBase: string | null;
  commissionValue: string | null;
  mechanicId: string | null;
  mechanic: {
    id: string;
    name: string;
  } | null;
  sectorId: string | null;
  sector: {
    id: string;
    name: string;
  } | null;
  catalogItem: {
    id: string;
    code: number;
    name: string;
    type: "PRODUTO" | "SERVICO";
    stockCurrent: string | null;
  } | null;
};

export type Estimate = {
  id: string;
  code: number;
  status: EstimateStatus;
  type: string;
  clientId: string;
  vehicleId: string;
  responsible: string;
  validUntil: string | null;
  notesInternal: string | null;
  notesClient: string | null;
  subtotal: string;
  discountTotal: string;
  total: string;
  convertedServiceOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  } | null;
  vehicle: {
    id: string;
    plate: string;
    brand?: string | null;
    model: string | null;
    version?: string | null;
    color?: string | null;
    manufactureYear?: number | null;
    modelYear?: number | null;
  } | null;
  mechanic: {
    id: string;
    name: string;
  } | null;
  convertedServiceOrder: {
    id: string;
    code: number;
    status?: string;
    mechanic?: {
      id: string;
      name: string;
    } | null;
  } | null;
  items?: EstimateItem[];
};

export type EstimateListResponse = {
  items: Estimate[];
  total: number;
  page: number;
  pageSize: number;
};

export type EstimateItemFormValues = {
  id: string;
  type: "SERVICE" | "PRODUCT";
  catalogItemId: string;
  mechanicId: string;
  sectorId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  commissionBase: string;
  commissionValue: string;
};

export type EstimatePayloadItem = {
  type: "SERVICE" | "PRODUCT";
  catalogItemId: string | null;
  mechanicId: string | null;
  sectorId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  commissionBase: number | null;
  commissionValue: number | null;
};

export type EstimateFormValues = {
  clientId: string;
  vehicleId: string;
  responsible: string;
  validUntil: string;
  status: EstimateStatus;
  type: string;
  notesInternal: string;
  notesClient: string;
  items: EstimateItemFormValues[];
};

export type EstimatePayload = {
  clientId: string;
  vehicleId: string;
  responsible: string;
  validUntil: string | null;
  status: EstimateStatus;
  type: string;
  notesInternal: string | null;
  notesClient: string | null;
  items: EstimatePayloadItem[];
};

export type EstimateStatusPayload = {
  status: EstimateStatus;
};

export type ConvertEstimateResponse = {
  estimate: Estimate;
  order: {
    id: string;
    code: number;
  };
};

export type EstimateFormProps = {
  mode: "create" | "edit";
  initialData?: Estimate | null;
};

export type QuickCatalogDialogState = {
  mode: "create" | "stock";
  itemId: string;
  itemType?: EstimateItemFormValues["type"];
  catalogItemId?: string;
} | null;

export type QuickCatalogFormValues = {
  name: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  stockMinimum: string;
  notes: string;
};
