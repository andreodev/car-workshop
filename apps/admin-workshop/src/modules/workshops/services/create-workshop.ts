import { api } from "@/shared/http/api";

import type {
  CreateWorkshopPayload,
  Workshop,
  WorkshopFormValues,
} from "../types/workshop.types";

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function toCreateWorkshopPayload(values: WorkshopFormValues): CreateWorkshopPayload {
  return {
    name: values.name.trim(),
    slug: values.slug.trim().toLowerCase(),
    legalName: values.legalName.trim(),
    tradeName: optionalString(values.tradeName),
    document: optionalString(values.document),
    email: optionalString(values.email),
    phone: optionalString(values.phone),
    customDomain: optionalString(values.customDomain),
    branding: {
      logoUrl: optionalString(values.logoUrl),
    },
  };
}

export async function createWorkshop(values: WorkshopFormValues) {
  const { data } = await api.post<Workshop>(
    "/admin/workshops",
    toCreateWorkshopPayload(values)
  );

  return data;
}
