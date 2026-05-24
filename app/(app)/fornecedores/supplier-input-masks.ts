import {
  maskCep,
  maskCpf,
  maskPhone,
  maskRg,
  maskState,
} from "../clientes/client-input-masks";
import type { SupplierFormValues } from "./types";

type SupplierInputMask = (value: string) => string;

const textLimits = {
  name: 120,
  contact: 120,
  productLine: 160,
  email: 255,
  website: 255,
  city: 120,
  address: 255,
  neighborhood: 120,
  bank: 120,
  account: 60,
  agency: 60,
  notes: 1000,
} satisfies Partial<Record<keyof SupplierFormValues, number>>;

function limitText(value: string, max: number) {
  return value.slice(0, max);
}

export function maskSupplierFormField<K extends keyof SupplierFormValues>(
  field: K,
  value: SupplierFormValues[K]
) {
  const mask = supplierInputMasks[field];
  return (mask ? mask(value) : value) as SupplierFormValues[K];
}

export const supplierInputMasks = {
  personType: (value) => value,
  name: (value) => limitText(value, textLimits.name),
  cpf: maskCpf,
  rg: maskRg,
  contact: (value) => limitText(value, textLimits.contact),
  productLine: (value) => limitText(value, textLimits.productLine),
  phone1: maskPhone,
  phone2: maskPhone,
  phone3: maskPhone,
  phone4: maskPhone,
  email: (value) => limitText(value.trimStart().toLowerCase(), textLimits.email),
  website: (value) => limitText(value.trimStart(), textLimits.website),
  cep: maskCep,
  city: (value) => limitText(value, textLimits.city),
  state: maskState,
  address: (value) => limitText(value, textLimits.address),
  neighborhood: (value) => limitText(value, textLimits.neighborhood),
  bank: (value) => limitText(value, textLimits.bank),
  account: (value) => limitText(value, textLimits.account),
  agency: (value) => limitText(value, textLimits.agency),
  notes: (value) => limitText(value, textLimits.notes),
} satisfies Record<keyof SupplierFormValues, SupplierInputMask>;
