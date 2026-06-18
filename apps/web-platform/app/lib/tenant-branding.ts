import { getTenantContext, TenantAccessError } from "@/app/lib/tenant-context";
import { prisma } from "@/app/lib/prisma";

export type TenantBranding = {
  title: string;
  logoUrl: string | null;
};

export const fallbackBranding: TenantBranding = {
  title: "Rikinho Auto Center",
  logoUrl: null,
};

export async function getCurrentTenantBranding(): Promise<TenantBranding> {
  try {
    const { tenantId, tenant } = await getTenantContext();
    const settings = await prisma.companySettings.findUnique({
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
    });

    return {
      title: settings?.tradeName ?? settings?.legalName ?? tenant.name,
      logoUrl: settings?.logoUrl ?? null,
    };
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return fallbackBranding;
    }

    throw error;
  }
}
