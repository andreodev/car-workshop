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
  const mask = companySettingsInputMasks[field];
  return (mask ? mask(value) : value) as CompanySettingsFormValues[K];
}

export const companySettingsInputMasks = {
  legalName: (value) => limitText(String(value), textLimits.legalName),
  tradeName: (value) => limitText(String(value), textLimits.tradeName),
  document: (value) => maskCnpj(String(value)),
  stateRegistration: (value) => limitText(String(value), textLimits.stateRegistration),
  municipalRegistration: (value) => limitText(String(value), textLimits.municipalRegistration),
  email: (value) => limitText(String(value).trimStart().toLowerCase(), textLimits.email),
  phone: (value) => maskPhone(String(value)),
  whatsapp: (value) => maskPhone(String(value)),
  website: (value) => limitText(String(value).trimStart(), textLimits.website),
  cep: (value) => maskCep(String(value)),
  address: (value) => limitText(String(value), textLimits.address),
  number: (value) => limitText(String(value), textLimits.number),
  complement: (value) => limitText(String(value), textLimits.complement),
  neighborhood: (value) => limitText(String(value), textLimits.neighborhood),
  city: (value) => limitText(String(value), textLimits.city),
  state: (value) => maskState(String(value)),
  ibgeCode: (value) => maskIbgeCode(String(value)),
  logoUrl: (value) => limitText(String(value).trimStart(), textLimits.logoUrl),
  documentFooter: (value) => limitText(String(value), textLimits.documentFooter),
  commercialNotes: (value) => limitText(String(value), textLimits.commercialNotes),
} satisfies Record<keyof CompanySettingsFormValues, CompanySettingsInputMask>;
