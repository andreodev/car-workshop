export type FinancialAccountType = "RECEBER" | "PAGAR";
export type FinancialAccountStatus = "ABERTA" | "PAGA" | "VENCIDA" | "CANCELADA";
export type FinancialCategoryType = "RECEITA" | "DESPESA" | "AMBOS";
export type CashMovementType = "ENTRADA" | "SAIDA";
export type FinancialPaymentMethod =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "BOLETO"
  | "OUTRO";

export type FinancialAccount = {
  id: string;
  code: number;
  type: FinancialAccountType;
  status: FinancialAccountStatus;
  description: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  serviceOrderId: string | null;
  serviceOrder: { id: string; code: number; status: string } | null;
  supplierOrderId: string | null;
  supplierOrder: { id: string; code: number; status: string } | null;
  counterparty: string | null;
  category: string | null;
  documentNumber: string | null;
  dueDate: string;
  paymentDate: string | null;
  amount: string;
  paidAmount: string | null;
  paymentMethod: FinancialPaymentMethod | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialAccountSummary = {
  type: FinancialAccountType;
  status: FinancialAccountStatus;
  _sum: {
    amount: string | null;
    paidAmount: string | null;
  };
  _count: {
    _all: number;
  };
};

export type FinancialAccountListResponse = {
  items: FinancialAccount[];
  total: number;
  page: number;
  pageSize: number;
  summary: FinancialAccountSummary[];
};

export type FinancialAccountFormValues = {
  type: FinancialAccountType;
  status: FinancialAccountStatus;
  description: string;
  clientId: string;
  counterparty: string;
  category: string;
  documentNumber: string;
  dueDate: string;
  paymentDate: string;
  amount: string;
  paidAmount: string;
  paymentMethod: FinancialPaymentMethod | "";
  notes: string;
};

export type FinancialCategory = {
  id: string;
  code: number;
  name: string;
  type: FinancialCategoryType;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialCategoryListResponse = {
  items: FinancialCategory[];
  total: number;
  page: number;
  pageSize: number;
};

export type FinancialCategoryFormValues = {
  name: string;
  type: FinancialCategoryType;
  active: boolean;
  notes: string;
};

export type CashMovement = {
  id: string;
  code: number;
  type: CashMovementType;
  categoryId: string | null;
  category: { id: string; name: string; type: FinancialCategoryType } | null;
  saleId: string | null;
  sale: { id: string; code: number; status: string } | null;
  financialAccountId: string | null;
  financialAccount: { id: string; code: number; type: FinancialAccountType } | null;
  description: string;
  movementDate: string;
  amount: string;
  paymentMethod: FinancialPaymentMethod | null;
  documentNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashMovementSummary = {
  type: CashMovementType;
  _sum: {
    amount: string | null;
  };
  _count: {
    _all: number;
  };
};

export type CashMovementListResponse = {
  items: CashMovement[];
  total: number;
  page: number;
  pageSize: number;
  summary: CashMovementSummary[];
};

export type MechanicCommissionPeriod = "daily" | "weekly" | "monthly";

export type MechanicCommissionSourceItem = {
  id: string;
  description: string;
  type: "SERVICE" | "PRODUCT";
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  commissionBase: string;
};

export type MechanicCommissionAccount = {
  id: string;
  code: number;
  description: string;
  documentNumber: string | null;
  dueDate: string;
  amount: string;
  status: "ABERTA" | "VENCIDA";
  notes: string | null;
  commissionPercent: string | null;
  commissionBase: string;
  serviceOrder: {
    id: string;
    code: number;
    status: string;
    entryAt: string;
    client: { id: string; name: string } | null;
    vehicle: {
      id: string;
      plate: string;
      brand: string | null;
      model: string | null;
    } | null;
    total: string;
    subtotal: string;
  } | null;
  sourceItems: MechanicCommissionSourceItem[];
};

export type MechanicCommissionGroup = {
  mechanicName: string;
  total: string;
  accountsCount: number;
  ordersCount: number;
  accounts: MechanicCommissionAccount[];
};

export type MechanicCommissionReport = {
  period: MechanicCommissionPeriod;
  periodLabel: string;
  from: string;
  to: string;
  summary: {
    total: string;
    mechanicsCount: number;
    accountsCount: number;
  };
  groups: MechanicCommissionGroup[];
};

export type CashMovementFormValues = {
  type: CashMovementType;
  categoryId: string;
  description: string;
  movementDate: string;
  amount: string;
  paymentMethod: FinancialPaymentMethod | "";
  documentNumber: string;
  notes: string;
};
