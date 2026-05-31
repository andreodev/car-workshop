import type { ClientFormValues } from "../types/client.types";

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

export function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
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
  name: (value) => limitText(value, textLimits.name),
  cpf: maskCpf,
  rg: maskRg,
  birthDate: maskDateInput,
  notesBasic: (value) => limitText(value, textLimits.notesBasic),
  email: (value) => limitText(value.trimStart().toLowerCase(), textLimits.email),
  phoneResidential: maskPhone,
  phoneCommercial: maskPhone,
  mobile: maskPhone,
  phone1: maskPhone,
  phone2: maskPhone,
  phone3: maskPhone,
  phone4: maskPhone,
  website: (value) => limitText(value.trimStart(), textLimits.website),
  social: (value) => limitText(value.trimStart(), textLimits.social),
  otherContact: (value) => limitText(value, textLimits.otherContact),
  notesContacts: (value) => limitText(value, textLimits.notesContacts),
  cep: maskCep,
  address: (value) => limitText(value, textLimits.address),
  number: (value) => limitText(value, textLimits.number),
  complement: (value) => limitText(value, textLimits.complement),
  state: maskState,
  city: (value) => limitText(value, textLimits.city),
  neighborhood: (value) => limitText(value, textLimits.neighborhood),
  ibgeCode: maskIbgeCode,
  notesAddress: (value) => limitText(value, textLimits.notesAddress),
} satisfies Record<keyof ClientFormValues, ClientInputMask>;
