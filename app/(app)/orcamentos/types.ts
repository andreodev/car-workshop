export type EstimateStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "APROVADO"
  | "REJEITADO"
  | "CONVERTIDO"
  | "CANCELADO";

export type EstimateItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
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
    model: string | null;
  } | null;
  convertedServiceOrder: {
    id: string;
    code: number;
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
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

export type EstimatePayloadItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
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
