import type { Client, ClientFormValues } from "../types/client.types";
import {
  maskCep,
  maskCpf,
  maskIbgeCode,
  maskPhone,
  maskRg,
  maskState,
} from "./client-input-masks";

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>;

export const formatCpf = maskCpf;
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
    name: client.name ?? "",
    cpf: formatCpf(client.cpf ?? ""),
    rg: formatRg(client.rg ?? ""),
    birthDate: normalizeDateInput(client.birthDate),
    notesBasic: client.notesBasic ?? "",
    email: client.email ?? "",
    phoneResidential: formatPhone(client.phoneResidential ?? ""),
    phoneCommercial: formatPhone(client.phoneCommercial ?? ""),
    mobile: formatPhone(client.mobile ?? ""),
    phone1: formatPhone(client.phone1 ?? ""),
    phone2: formatPhone(client.phone2 ?? ""),
    phone3: formatPhone(client.phone3 ?? ""),
    phone4: formatPhone(client.phone4 ?? ""),
    website: client.website ?? "",
    social: client.social ?? "",
    otherContact: client.otherContact ?? "",
    notesContacts: client.notesContacts ?? "",
    cep: formatCep(client.cep ?? ""),
    address: client.address ?? "",
    number: client.number ?? "",
    complement: client.complement ?? "",
    state: formatState(client.state ?? ""),
    city: client.city ?? "",
    neighborhood: client.neighborhood ?? "",
    ibgeCode: formatIbgeCode(client.ibgeCode ?? ""),
    notesAddress: client.notesAddress ?? "",
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
