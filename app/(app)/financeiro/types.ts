export type FinancialAccountType = "RECEBER" | "PAGAR";
export type FinancialAccountStatus = "ABERTA" | "PAGA" | "VENCIDA" | "CANCELADA";
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
