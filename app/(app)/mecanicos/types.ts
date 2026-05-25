import type { MechanicFormSchemaOutput } from "./mechanic-form-schema";

export type Mechanic = {
  id: string;
  code: number;
  name: string;
  active: boolean;
  commissionPercent: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MechanicListResponse = {
  items: Mechanic[];
  total: number;
  page: number;
  pageSize: number;
};

export type MechanicFormValues = {
  name: string;
  active: boolean;
  commissionPercent: string;
  notes: string;
};

export type MechanicSavePayload = MechanicFormSchemaOutput;

export type MechanicReportOrder = {
  id: string;
  code: number;
  status: "ABERTA" | "EM_ANDAMENTO" | "AGUARDANDO_PECAS" | "IMPEDIDA" | "FINALIZADA" | "CANCELADA";
  entryAt: string;
  estimatedAt: string | null;
  updatedAt: string;
  total: string;
  serviceTotal: string;
  commissionTotal: string;
  location: string | null;
  client: {
    id: string;
    name: string;
  } | null;
  vehicle: {
    id: string;
    plate: string;
    model: string | null;
  } | null;
};

export type MechanicReportStatusSummary = {
  status: MechanicReportOrder["status"];
  count: number;
  total: string;
};

export type MechanicReport = {
  mechanic: Mechanic;
  summary: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    blockedOrders: number;
    waitingPartsOrders: number;
    monthCompletedOrders: number;
    totalRevenue: string;
    activeRevenue: string;
    completedRevenue: string;
    serviceRevenue: string;
    activeServiceRevenue: string;
    completedServiceRevenue: string;
    commissionPercent: string;
    commissionTotal: string;
    completedCommissionTotal: string;
  };
  statusSummary: MechanicReportStatusSummary[];
  activeOrders: MechanicReportOrder[];
  recentOrders: MechanicReportOrder[];
};
