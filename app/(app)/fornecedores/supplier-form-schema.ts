import { z } from "zod";

import { onlyDigits } from "../clientes/client-input-masks";
import type { SupplierPersonType } from "./types";

const personTypeSchema = z.enum(["FISICA", "JURIDICA"] satisfies [
  SupplierPersonType,
  ...SupplierPersonType[],
]);

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no máximo ${max} caracteres.`,
    });

const emailField = z
  .string({ error: "E-mail inválido." })
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Informe um e-mail válido.",
  });

const digitsField = (label: string, max: number, validLengths?: number[]) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => onlyDigits(value).slice(0, max))
    .refine(
      (value) =>
        value === "" ||
        (validLengths ? validLengths.includes(value.length) : value.length <= max),
      { message: `${label} inválido.` }
    );

const stateField = z
  .string({ error: "Estado inválido." })
  .transform((value) => value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))
  .refine((value) => value === "" || value.length === 2, {
    message: "Estado deve ter 2 letras.",
  });

export const supplierFormSchema = z.object({
  personType: personTypeSchema,
  name: textField("Nome", 120).refine((value) => value.length > 0, {
    message: "Nome é obrigatório.",
  }),
  cpf: digitsField("CPF", 11, [11]),
  rg: digitsField("RG", 14),
  contact: textField("Contato", 120),
  productLine: textField("Linha de produtos", 160),
  phone1: digitsField("Telefone 1", 11, [10, 11]),
  phone2: digitsField("Telefone 2", 11, [10, 11]),
  phone3: digitsField("Telefone 3", 11, [10, 11]),
  phone4: digitsField("Telefone 4", 11, [10, 11]),
  email: emailField,
  website: textField("Site", 255),
  cep: digitsField("CEP", 8, [8]),
  city: textField("Cidade", 120),
  state: stateField,
  address: textField("Endereço", 255),
  neighborhood: textField("Bairro", 120),
  bank: textField("Banco", 120),
  account: textField("Conta", 60),
  agency: textField("Agência", 60),
  notes: textField("OBS", 1000),
});

export type SupplierFormSchemaInput = z.input<typeof supplierFormSchema>;
export type SupplierFormSchemaOutput = z.output<typeof supplierFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}
