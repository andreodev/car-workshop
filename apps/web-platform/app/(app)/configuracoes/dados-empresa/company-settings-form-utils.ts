import type { z } from "zod";

import type { CompanySettings, CompanySettingsFormValues } from "./types";

export type CompanySettingsFormErrors = Partial<Record<keyof CompanySettingsFormValues, string>>;

export const emptyCompanySettingsForm: CompanySettingsFormValues = {
  legalName: "",
  tradeName: "",
  document: "",
  stateRegistration: "",
  municipalRegistration: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  ibgeCode: "",
  logoUrl: "",
  documentFooter: "",
  commercialNotes: "",
};

export function mapCompanySettingsToFormValues(
  settings: CompanySettings | null
): CompanySettingsFormValues {
  if (!settings) {
    return emptyCompanySettingsForm;
  }

  return {
    legalName: settings.legalName,
    tradeName: settings.tradeName ?? "",
    document: settings.document ?? "",
    stateRegistration: settings.stateRegistration ?? "",
    municipalRegistration: settings.municipalRegistration ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    website: settings.website ?? "",
    cep: settings.cep ?? "",
    address: settings.address ?? "",
    number: settings.number ?? "",
    complement: settings.complement ?? "",
    neighborhood: settings.neighborhood ?? "",
    city: settings.city ?? "",
    state: settings.state ?? "",
    ibgeCode: settings.ibgeCode ?? "",
    logoUrl: settings.logoUrl ?? "",
    documentFooter: settings.documentFooter ?? "",
    commercialNotes: settings.commercialNotes ?? "",
  };
}

export function getCompanySettingsErrorMap(
  issues: z.core.$ZodIssue[]
): CompanySettingsFormErrors {
  return issues.reduce<CompanySettingsFormErrors>((errors, issue) => {
    const field = issue.path[0] as keyof CompanySettingsFormValues | undefined;

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}
