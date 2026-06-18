import type { ClientFormValues } from "../types/client.types";
import type { ClientPersonType } from "../types/client.types";

type ClientInputMask = (value: string) => string;

const textLimits = {
  name: 120,
  notesBasic: 1000,
  email: 255,
  website: 255,
  social: 120,
  otherContact: 120,
  notesContacts: 1000,
  address: 255,
  number: 20,
  complement: 120,
  city: 120,
  neighborhood: 120,
  notesAddress: 1000,
} satisfies Partial<Record<keyof ClientFormValues, number>>;

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function limitText(value: string, max: number) {
  return value.slice(0, max);
}

function limitUppercaseText(value: string, max: number) {
  return limitText(value.toUpperCase(), max);
}

export function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCpfCnpj(value: string) {
  const digits = onlyDigits(value);

  return digits.length > 11 ? maskCnpj(digits) : maskCpf(digits);
}

export function maskDocumentByPersonType(value: string, personType: ClientPersonType) {
  return personType === "JURIDICA" ? maskCnpj(value) : maskCpf(value);
}

export function maskCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  }

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  }

  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export function maskRg(value: string) {
  return onlyDigits(value).slice(0, 14);
}

export function maskIbgeCode(value: string) {
  return onlyDigits(value).slice(0, 7);
}

export function maskState(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

export function maskDateInput(value: string) {
  return value.slice(0, 10);
}

export function maskClientFormField<K extends keyof ClientFormValues>(
  field: K,
  value: ClientFormValues[K]
) {
  if (typeof value !== "string") {
    return value;
  }

  const mask = clientInputMasks[field];
  return (mask ? mask(value) : value) as ClientFormValues[K];
}

export const clientInputMasks = {
  personType: (value) => value,
  status: (value) => value,
  icms: (value) => value,
  name: (value) => limitUppercaseText(value, textLimits.name),
  cpf: maskCpfCnpj,
  rg: maskRg,
  birthDate: maskDateInput,
  notesBasic: (value) => limitUppercaseText(value, textLimits.notesBasic),
  email: (value) => limitUppercaseText(value.trimStart(), textLimits.email),
  phoneResidential: maskPhone,
  phoneCommercial: maskPhone,
  mobile: maskPhone,
  phone1: maskPhone,
  phone2: maskPhone,
  phone3: maskPhone,
  phone4: maskPhone,
  website: (value) => limitUppercaseText(value.trimStart(), textLimits.website),
  social: (value) => limitUppercaseText(value.trimStart(), textLimits.social),
  otherContact: (value) => limitUppercaseText(value, textLimits.otherContact),
  notesContacts: (value) => limitUppercaseText(value, textLimits.notesContacts),
  cep: maskCep,
  address: (value) => limitUppercaseText(value, textLimits.address),
  number: (value) => limitUppercaseText(value, textLimits.number),
  complement: (value) => limitUppercaseText(value, textLimits.complement),
  state: maskState,
  city: (value) => limitUppercaseText(value, textLimits.city),
  neighborhood: (value) => limitUppercaseText(value, textLimits.neighborhood),
  ibgeCode: maskIbgeCode,
  notesAddress: (value) => limitUppercaseText(value, textLimits.notesAddress),
} satisfies Record<keyof ClientFormValues, ClientInputMask>;
