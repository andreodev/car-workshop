import { z } from "zod";

import { onlyDigits } from "@/modules/client/utils/client-input-masks";

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} invalido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no maximo ${max} caracteres.`,
    });

const emailField = z
  .string({ error: "E-mail invalido." })
  .transform((value) => value.trim())
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Informe um e-mail valido.",
  });

const urlField = (label: string, max: number) =>
  textField(label, max).refine(
    (value) => value === "" || value.startsWith("http://") || value.startsWith("https://"),
    { message: `${label} deve comecar com http:// ou https://.` }
  );

const digitsField = (label: string, max: number, validLengths?: number[]) =>
  z
    .string({ error: `${label} invalido.` })
    .transform((value) => onlyDigits(value).slice(0, max))
    .refine(
      (value) =>
        value === "" ||
        (validLengths ? validLengths.includes(value.length) : value.length <= max),
      { message: `${label} invalido.` }
    );

const stateField = z
  .string({ error: "Estado invalido." })
  .transform((value) => value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))
  .refine((value) => value === "" || value.length === 2, {
    message: "Estado deve ter 2 letras.",
  });

export const companySettingsFormSchema = z.object({
  legalName: textField("Razao social", 160).refine((value) => value.length > 0, {
    message: "Razao social e obrigatoria.",
  }),
  tradeName: textField("Nome fantasia", 120),
  document: digitsField("CNPJ", 14, [14]),
  stateRegistration: textField("Inscricao estadual", 30),
  municipalRegistration: textField("Inscricao municipal", 30),
  email: emailField,
  phone: digitsField("Telefone", 11, [10, 11]),
  whatsapp: digitsField("WhatsApp", 11, [10, 11]),
  website: textField("Site", 255),
  cep: digitsField("CEP", 8, [8]),
  address: textField("Endereco", 255),
  number: textField("Numero", 20),
  complement: textField("Complemento", 120),
  neighborhood: textField("Bairro", 120),
  city: textField("Cidade", 120),
  state: stateField,
  ibgeCode: digitsField("Codigo IBGE", 7, [7]),
  logoUrl: urlField("URL do logo", 500),
  documentFooter: textField("Rodape dos documentos", 1000),
  commercialNotes: textField("Informacoes comerciais", 1000),
});

export type CompanySettingsFormSchemaOutput = z.output<typeof companySettingsFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}
