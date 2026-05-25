import type {
  CashMovementType,
  FinancialAccountStatus,
  FinancialAccountType,
  FinancialCategoryType,
  FinancialPaymentMethod,
} from "./types";

export const financialTypeOptions: Array<{ value: FinancialAccountType; label: string }> = [
  { value: "RECEBER", label: "Conta a receber" },
  { value: "PAGAR", label: "Conta a pagar" },
];

export const financialStatusOptions: Array<{ value: FinancialAccountStatus; label: string }> = [
  { value: "ABERTA", label: "Aberta" },
  { value: "VENCIDA", label: "Vencida" },
  { value: "PAGA", label: "Paga" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const financialPaymentMethodOptions: Array<{
  value: FinancialPaymentMethod;
  label: string;
}> = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "CARTAO_CREDITO", label: "Cartao de credito" },
  { value: "CARTAO_DEBITO", label: "Cartao de debito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

export const financialCategoryTypeOptions: Array<{
  value: FinancialCategoryType;
  label: string;
}> = [
  { value: "RECEITA", label: "Receita" },
  { value: "DESPESA", label: "Despesa" },
  { value: "AMBOS", label: "Ambos" },
];

export const cashMovementTypeOptions: Array<{ value: CashMovementType; label: string }> = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saida" },
];

export function getFinancialStatusLabel(status: FinancialAccountStatus) {
  return financialStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getFinancialTypeLabel(type: FinancialAccountType) {
  return financialTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function getPaymentMethodLabel(method: FinancialPaymentMethod | null) {
  if (!method) {
    return "-";
  }

  return financialPaymentMethodOptions.find((option) => option.value === method)?.label ?? method;
}

export function getFinancialCategoryTypeLabel(type: FinancialCategoryType) {
  return financialCategoryTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function getCashMovementTypeLabel(type: CashMovementType) {
  return cashMovementTypeOptions.find((option) => option.value === type)?.label ?? type;
}
