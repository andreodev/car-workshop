export type ServiceOrderStatus =
  | "ABERTA"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_PECAS"
  | "IMPEDIDA"
  | "FINALIZADA"
  | "CANCELADA";

export type ServiceOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
};

export type ServiceOrder = {
  id: string;
  code: number;
  status: ServiceOrderStatus;
  clientId: string;
  vehicleId: string;
  responsible: string;
  location: string | null;
  km: number | null;
  entryAt: string;
  estimatedAt: string | null;
  notesInternal: string | null;
  notesClient: string | null;
  subtotal: string;
  discountTotal: string;
  total: string;
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
  items?: ServiceOrderItem[];
};

export type ServiceOrderListResponse = {
  items: ServiceOrder[];
  total: number;
  page: number;
  pageSize: number;
};

export type ServiceOrderItemFormValues = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

export type ServiceOrderPayloadItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export type ServiceOrderFormValues = {
  clientId: string;
  vehicleId: string;
  responsible: string;
  location: string;
  km: string;
  entryDate: string;
  entryTime: string;
  estimatedDate: string;
  estimatedTime: string;
  status: ServiceOrderStatus;
  notesInternal: string;
  notesClient: string;
  items: ServiceOrderItemFormValues[];
};

export type ServiceOrderPayload = {
  clientId: string;
  vehicleId: string;
  responsible: string;
  location: string | null;
  km: number | null;
  entryAt: string;
  estimatedAt: string | null;
  status: ServiceOrderStatus;
  notesInternal: string | null;
  notesClient: string | null;
  items: ServiceOrderPayloadItem[];
};

export type ServiceOrderStatusPayload = {
  status: ServiceOrderStatus;
};
