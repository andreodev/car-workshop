export type ServiceOrderStatus =
  | "ABERTA"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_PECAS"
  | "IMPEDIDA"
  | "FINALIZADA"
  | "CANCELADA"
  | "PAGA";

export type ServiceOrderItemType = "SERVICE" | "PRODUCT";

export type ServiceOrderItem = {
  id: string;
  type: ServiceOrderItemType;
  catalogItemId: string | null;
  catalogItem?: {
    id: string;
    code: number;
    name: string;
    type: "PRODUTO" | "SERVICO";
    stockCurrent: string | null;
  } | null;
  mechanicId: string | null;
  mechanic?: {
    id: string;
    name: string;
  } | null;
  sectorId: string | null;
  sector?: {
    id: string;
    name: string;
  } | null;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  commissionBase: string | null;
};

export type ServiceOrderVehicleInspectionPhoto = {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  caption: string | null;
  createdAt: string;
};

export type ServiceOrderVehicleInspection = {
  id: string;
  token: string;
  status: "PENDENTE" | "CONCLUIDA";
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  photos: ServiceOrderVehicleInspectionPhoto[];
};

export type ServiceOrder = {
  id: string;
  code: number;
  status: ServiceOrderStatus;
  clientId: string;
  vehicleId: string;
  mechanicId: string | null;
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
  mechanic: {
    id: string;
    name: string;
  } | null;
  estimateConversion?: {
    id: string;
    code: number;
    status: string;
  } | null;
  vehicleInspection?: ServiceOrderVehicleInspection | null;
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
  type: ServiceOrderItemType;
  catalogItemId: string;
  mechanicId: string;
  sectorId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  commissionBase: string;
};

export type ServiceOrderPayloadItem = {
  type: ServiceOrderItemType;
  catalogItemId: string | null;
  mechanicId: string | null;
  sectorId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  commissionBase: number | null;
};

export type ServiceOrderFormValues = {
  clientId: string;
  vehicleId: string;
  mechanicId: string;
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
  mechanicId: string;
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
