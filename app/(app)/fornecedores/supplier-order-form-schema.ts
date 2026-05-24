import { z } from "zod";

import type { SupplierOrderStatus } from "./types";

const statusSchema = z.enum(["ABERTO", "RECEBIDO", "CANCELADO"] satisfies [
  SupplierOrderStatus,
  ...SupplierOrderStatus[],
]);

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no máximo ${max} caracteres.`,
    });

const dateField = z
  .string({ error: "Previsão inválida." })
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Previsão é obrigatória." })
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
    message: "Informe uma previsão válida.",
  });

export const supplierOrderFormSchema = z.object({
  supplierId: textField("Fornecedor", 80).refine((value) => value.length > 0, {
    message: "Fornecedor é obrigatório.",
  }),
  status: statusSchema,
  employee: textField("Funcionário", 120).refine((value) => value.length > 0, {
    message: "Funcionário é obrigatório.",
  }),
  forecastAt: dateField,
  invoiceNumber: textField("Número NF", 60),
  observation: textField("Observação", 1000),
  internalDescription: textField("Descrição interna", 1000),
});

export type SupplierOrderFormSchemaInput = z.input<typeof supplierOrderFormSchema>;
export type SupplierOrderFormSchemaOutput = z.output<typeof supplierOrderFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}

export function toDateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}
