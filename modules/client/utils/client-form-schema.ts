import { z } from "zod";

import { onlyDigits } from "./client-input-masks";
import type {
  ClientIcms,
  ClientPersonType,
  ClientStatus,
} from "../types/client.types";

const personTypeSchema = z.enum(["FISICA", "JURIDICA"] satisfies [ClientPersonType, ...ClientPersonType[]]);
const statusSchema = z.enum(["ATIVO", "INATIVO"] satisfies [ClientStatus, ...ClientStatus[]]);
const icmsSchema = z.enum(
  ["ISENTO", "CONTRIBUINTE", "NAO_CONTRIBUINTE"] satisfies [ClientIcms, ...ClientIcms[]]
);

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no máximo ${max} caracteres.`,
    });

const emailField = z
  .string({ error: "E-mail inválido." })
  .transform((value) => value.trim())
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Informe um e-mail válido.",
  });

const dateField = z
  .string({ error: "Data de nascimento inválida." })
  .transform((value) => value.trim())
  .refine((value) => value === "" || !Number.isNaN(new Date(value).getTime()), {
    message: "Informe uma data válida.",
  })
  .refine((value) => value === "" || new Date(value) <= new Date(), {
    message: "Data de nascimento não pode ser futura.",
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

export const clientFormSchema = z
  .object({
    personType: personTypeSchema,
    status: statusSchema,
    icms: icmsSchema,
    name: textField("Nome", 120).refine((value) => value.length > 0, {
      message: "Nome é obrigatório.",
    }),
    cpf: digitsField("CPF", 11, [11]),
    rg: digitsField("RG", 14),
    birthDate: dateField,
    notesBasic: textField("Anotações internas", 1000),
    email: emailField,
    phoneResidential: digitsField("Telefone residencial", 11, [10, 11]),
    phoneCommercial: digitsField("Telefone comercial", 11, [10, 11]),
    mobile: digitsField("Celular", 11, [10, 11]),
    phone1: digitsField("Telefone 1", 11, [10, 11]),
    phone2: digitsField("Telefone 2", 11, [10, 11]),
    phone3: digitsField("Telefone 3", 11, [10, 11]),
    phone4: digitsField("Telefone 4", 11, [10, 11]),
    website: textField("Site", 255),
    social: textField("Rede social", 120),
    otherContact: textField("Outro canal de contato", 120),
    notesContacts: textField("Anotações de contato", 1000),
    cep: digitsField("CEP", 8, [8]),
    address: textField("Endereço", 255),
    number: textField("Número", 20),
    complement: textField("Complemento", 120),
    state: stateField,
    city: textField("Cidade", 120),
    neighborhood: textField("Bairro", 120),
    ibgeCode: digitsField("Código IBGE", 7, [7]),
    notesAddress: textField("Anotações de endereço", 1000),
  })
  .superRefine((values, ctx) => {
    if (values.personType === "FISICA" && values.cpf !== "" && values.cpf.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpf"],
        message: "CPF deve ter 11 dígitos.",
      });
    }
  });

export type ClientFormSchemaInput = z.input<typeof clientFormSchema>;
export type ClientFormSchemaOutput = z.output<typeof clientFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}
