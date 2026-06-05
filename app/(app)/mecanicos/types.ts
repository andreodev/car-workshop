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

export type MechanicReportFinancialAccount = {
  id: string;
  code: number;
  status: "ABERTA" | "PAGA" | "VENCIDA" | "CANCELADA";
  description: string;
  documentNumber: string | null;
  dueDate: string;
  paymentDate: string | null;
  amount: string;
  paidAmount: string | null;
  paymentMethod:
    | "DINHEIRO"
    | "PIX"
    | "CARTAO_CREDITO"
    | "CARTAO_DEBITO"
    | "BOLETO"
    | "OUTRO"
    | null;
  notes: string | null;
};

export type MechanicReportOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  commissionBase: string;
  catalogItem: {
    id: string;
    code: number;
    name: string;
    type: "PRODUTO" | "SERVICO";
  } | null;
  sector: {
    id: string;
    name: string;
  } | null;
};

export type MechanicReportOrder = {
  id: string;
  code: number;
  status:
    | "ABERTA"
    | "EM_ANDAMENTO"
    | "AGUARDANDO_PECAS"
    | "IMPEDIDA"
    | "FINALIZADA"
    | "CANCELADA"
    | "PAGA";
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
    brand: string | null;
    model: string | null;
  } | null;
  items: MechanicReportOrderItem[];
  commissionAccounts: MechanicReportFinancialAccount[];
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
    serviceItemsCount: number;
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
    generatedCommissionTotal: string;
    pendingCommissionTotal: string;
    paidCommissionTotal: string;
    overdueCommissionTotal: string;
    commissionAccountsCount: number;
  };
  statusSummary: MechanicReportStatusSummary[];
  activeOrders: MechanicReportOrder[];
  recentOrders: MechanicReportOrder[];
  recentItems: Array<
    MechanicReportOrderItem & {
      order: {
        id: string;
        code: number;
        status: MechanicReportOrder["status"];
        entryAt: string;
        client: MechanicReportOrder["client"];
        vehicle: MechanicReportOrder["vehicle"];
      };
    }
  >;
};
