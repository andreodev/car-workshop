import type {
  ClientFormValues,
  ClientIcms,
  ClientPersonType,
  ClientStatus,
} from "../types";
import type { ClientFormStepValue } from "./client-form-stepper";

export const emptyClientForm: ClientFormValues = {
  personType: "FISICA",
  status: "ATIVO",
  icms: "ISENTO",
  name: "",
  cpf: "",
  rg: "",
  birthDate: "",
  notesBasic: "",
  email: "",
  phoneResidential: "",
  phoneCommercial: "",
  mobile: "",
  phone1: "",
  phone2: "",
  phone3: "",
  phone4: "",
  website: "",
  social: "",
  otherContact: "",
  notesContacts: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  state: "",
  city: "",
  neighborhood: "",
  ibgeCode: "",
  notesAddress: "",
};

export const inputClassName = "h-9 bg-background";
export const textareaClassName = "min-h-32 resize-y bg-background";

export const fieldToStepMap: Record<keyof ClientFormValues, ClientFormStepValue> = {
  personType: "dados",
  status: "dados",
  icms: "dados",
  name: "dados",
  cpf: "dados",
  rg: "dados",
  birthDate: "dados",
  notesBasic: "dados",
  email: "contato",
  phoneResidential: "contato",
  phoneCommercial: "contato",
  mobile: "contato",
  phone1: "contato",
  phone2: "contato",
  phone3: "contato",
  phone4: "contato",
  website: "contato",
  social: "contato",
  otherContact: "contato",
  notesContacts: "contato",
  cep: "endereco",
  address: "endereco",
  number: "endereco",
  complement: "endereco",
  state: "endereco",
  city: "endereco",
  neighborhood: "endereco",
  ibgeCode: "endereco",
  notesAddress: "endereco",
};

export const personOptions: Array<{ value: ClientPersonType; label: string }> = [
  { value: "FISICA", label: "Física" },
  { value: "JURIDICA", label: "Jurídica" },
];

export const statusOptions: Array<{ value: ClientStatus; label: string }> = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
];

export const icmsOptions: Array<{ value: ClientIcms; label: string }> = [
  { value: "ISENTO", label: "Isento" },
  { value: "CONTRIBUINTE", label: "Contribuinte" },
  { value: "NAO_CONTRIBUINTE", label: "Não contribuinte" },
];
