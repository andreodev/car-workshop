import { getTenantContext, TenantAccessError } from "@/app/lib/tenant-context";
import { prisma } from "@/app/lib/prisma";

export type TenantBranding = {
  title: string;
  logoUrl: string | null;
};

type CustomizationData = {
  imageUrl?: unknown;
  name?: unknown;
};

export const fallbackBranding: TenantBranding = {
  title: "Rikinho Auto Center",
  logoUrl: null,
};

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCustomizationData(value: unknown): CustomizationData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CustomizationData;
}

export async function getCurrentTenantBranding(): Promise<TenantBranding> {
  try {
    const { tenantId, tenant } = await getTenantContext();
    const [settings, customization] = await Promise.all([
      prisma.companySettings.findUnique({
        where: {
          tenantId_singletonKey: {
            tenantId,
            singletonKey: "company",
          },
        },
        select: {
          legalName: true,
          tradeName: true,
          logoUrl: true,
        },
      }),
      prisma.customization.findUnique({
        where: { tenantId },
        select: { data: true },
      }),
    ]);
    const customizationData = parseCustomizationData(customization?.data);

    return {
      title:
        getString(customizationData.name) ??
        settings?.tradeName ??
        settings?.legalName ??
        tenant.name,
      logoUrl: getString(customizationData.imageUrl) ?? settings?.logoUrl ?? null,
    };
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return fallbackBranding;
    }

    throw error;
  }
}
