import { z } from "zod";

export const tenantStatuses = ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELED"] as const;
export const customDomainStatuses = ["PENDING", "VERIFIED", "ERROR"] as const;

export type TenantStatus = (typeof tenantStatuses)[number];
export type CustomDomainStatus = (typeof customDomainStatuses)[number];

export type Workshop = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  customDomainVerificationToken?: string | null;
  customDomainLastError?: string | null;
  customDomainStatus: CustomDomainStatus;
  legalName: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkshopSummary = Workshop & {
  usersCount: number;
  clientsCount: number;
  serviceOrdersCount: number;
  salesCount: number;
};

export type WorkshopListParams = {
  search?: string;
  status?: TenantStatus;
  limit?: number;
  offset?: number;
};

export type WorkshopListResponse = {
  data: WorkshopSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type CustomDomainRecord = {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
};

export type CustomDomainInstructions = {
  cname: CustomDomainRecord;
  txt?: CustomDomainRecord;
};

export type CustomDomainResult = {
  workshop: Workshop;
  instructions: CustomDomainInstructions;
};

export const workshopFormSchema = z.object({
  name: z.string().min(2, "Informe o nome da oficina."),
  slug: z
    .string()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas kebab-case minusculo."),
  legalName: z.string().min(2, "Informe a razao social."),
  tradeName: z.string().optional(),
  document: z.string().optional(),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  customDomain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Informe um dominio valido.")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url("Informe uma URL valida.").optional().or(z.literal("")),
});

export type WorkshopFormValues = z.infer<typeof workshopFormSchema>;

export type CreateWorkshopPayload = Omit<WorkshopFormValues, "logoUrl"> & {
  branding: {
    logoUrl?: string;
  };
};
