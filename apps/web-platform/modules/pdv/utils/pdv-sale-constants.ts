import type { SalePaymentMethod } from "../types/pdv.types";

export const NO_SECTOR_VALUE = "SEM_SETOR";

export const paymentOptions: Array<{ value: SalePaymentMethod; label: string }> = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de débito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

export const keyboardShortcuts = [
  ["F2", "Produto"],
  ["F3", "Cliente"],
  ["F4", "Qtde"],
  ["F5", "Valor"],
  ["F6", "Pagamento"],
  ["Enter", "Incluir"],
  ["F8", "Finalizar"],
  ["Esc", "Fechar"],
  ["Del", "Remover ultimo"],
] as const;
