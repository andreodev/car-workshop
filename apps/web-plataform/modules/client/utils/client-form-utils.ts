import type { Client, ClientFormValues } from "../types/client.types";
import {
  maskCep,
  maskClientFormField,
  maskCpfCnpj,
  maskCpf,
  maskDocumentByPersonType,
  maskIbgeCode,
  maskPhone,
  maskRg,
  maskState,
} from "./client-input-masks";

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>;

export const formatCpf = maskCpf;
export const formatCpfCnpj = maskCpfCnpj;
export const formatCep = maskCep;
export const formatPhone = maskPhone;
export const formatRg = maskRg;
export const formatIbgeCode = maskIbgeCode;
export const formatState = maskState;

export function normalizeDateInput(value: string | null) {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.split("T")[0] : value;
}

export function mapClientToFormValues(client: Client): ClientFormValues {
  return {
    personType: client.personType,
    status: client.status,
    icms: client.icms,
    name: maskClientFormField("name", client.name ?? ""),
    cpf: maskDocumentByPersonType(client.cpf ?? "", client.personType),
    rg: formatRg(client.rg ?? ""),
    birthDate: normalizeDateInput(client.birthDate),
    notesBasic: maskClientFormField("notesBasic", client.notesBasic ?? ""),
    email: maskClientFormField("email", client.email ?? ""),
    phoneResidential: formatPhone(client.phoneResidential ?? ""),
    phoneCommercial: formatPhone(client.phoneCommercial ?? ""),
    mobile: formatPhone(client.mobile ?? ""),
    phone1: formatPhone(client.phone1 ?? ""),
    phone2: formatPhone(client.phone2 ?? ""),
    phone3: formatPhone(client.phone3 ?? ""),
    phone4: formatPhone(client.phone4 ?? ""),
    website: maskClientFormField("website", client.website ?? ""),
    social: maskClientFormField("social", client.social ?? ""),
    otherContact: maskClientFormField("otherContact", client.otherContact ?? ""),
    notesContacts: maskClientFormField("notesContacts", client.notesContacts ?? ""),
    cep: formatCep(client.cep ?? ""),
    address: maskClientFormField("address", client.address ?? ""),
    number: maskClientFormField("number", client.number ?? ""),
    complement: maskClientFormField("complement", client.complement ?? ""),
    state: formatState(client.state ?? ""),
    city: maskClientFormField("city", client.city ?? ""),
    neighborhood: maskClientFormField("neighborhood", client.neighborhood ?? ""),
    ibgeCode: formatIbgeCode(client.ibgeCode ?? ""),
    notesAddress: maskClientFormField("notesAddress", client.notesAddress ?? ""),
  };
}

export function getClientFormErrorMap(
  issues: Array<{ path: PropertyKey[]; message: string }>
) {
  const nextErrors: ClientFormErrors = {};

  issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field !== "string" || nextErrors[field as keyof ClientFormValues]) {
      return;
    }
    nextErrors[field as keyof ClientFormValues] = issue.message;
  });

  return nextErrors;
}
