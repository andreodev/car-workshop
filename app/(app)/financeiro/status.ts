import type {
  FinancialAccountStatus,
  FinancialAccountType,
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
