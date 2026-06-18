import { maskCep, maskPhone, onlyDigits } from "@/modules/client/utils/client-input-masks";

import type { CompanySettingsFormValues } from "./types";

type CompanySettingsInputMask = (value: string) => string;

const textLimits = {
  legalName: 160,
  tradeName: 120,
  stateRegistration: 30,
  municipalRegistration: 30,
  email: 255,
  website: 255,
  address: 255,
  number: 20,
  complement: 120,
  neighborhood: 120,
  city: 120,
  logoUrl: 500,
  documentFooter: 1000,
  commercialNotes: 1000,
} satisfies Partial<Record<keyof CompanySettingsFormValues, number>>;

function limitText(value: string, max: number) {
  return value.slice(0, max);
}

export function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskState(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

function maskIbgeCode(value: string) {
  return onlyDigits(value).slice(0, 7);
}

export function maskCompanySettingsField<K extends keyof CompanySettingsFormValues>(
  field: K,
  value: CompanySettingsFormValues[K]
) {
  if (typeof value !== "string") {
    return value;
  }

  const mask = companySettingsInputMasks[field];
  return (mask ? mask(value) : value) as CompanySettingsFormValues[K];
}

export const companySettingsInputMasks = {
  legalName: (value) => limitText(value, textLimits.legalName),
  tradeName: (value) => limitText(value, textLimits.tradeName),
  document: maskCnpj,
  stateRegistration: (value) => limitText(value, textLimits.stateRegistration),
  municipalRegistration: (value) => limitText(value, textLimits.municipalRegistration),
  email: (value) => limitText(value.trimStart().toLowerCase(), textLimits.email),
  phone: maskPhone,
  whatsapp: maskPhone,
  website: (value) => limitText(value.trimStart(), textLimits.website),
  cep: maskCep,
  address: (value) => limitText(value, textLimits.address),
  number: (value) => limitText(value, textLimits.number),
  complement: (value) => limitText(value, textLimits.complement),
  neighborhood: (value) => limitText(value, textLimits.neighborhood),
  city: (value) => limitText(value, textLimits.city),
  state: maskState,
  ibgeCode: maskIbgeCode,
  logoUrl: (value) => limitText(value.trimStart(), textLimits.logoUrl),
  documentFooter: (value) => limitText(value, textLimits.documentFooter),
  commercialNotes: (value) => limitText(value, textLimits.commercialNotes),
} satisfies Record<keyof CompanySettingsFormValues, CompanySettingsInputMask>;
