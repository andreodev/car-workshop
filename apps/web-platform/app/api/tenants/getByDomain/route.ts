import type { NextRequest } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { hostFromHeaders, hostFromUrl, normalizeHost } from "@/app/lib/tenant-host";
import { normalizeHexColor } from "@/app/lib/tenant-theme";

export const dynamic = "force-dynamic";

const LOCALHOST_DOMAIN_ALIAS =
  process.env.LOCALHOST_TENANT_DOMAIN ||
  process.env.NEXT_PUBLIC_LOCALHOST_TENANT_DOMAIN ||
  "app.rikinhoautocenter.com.br";

type CustomizationData = {
  primaryColor?: unknown;
  secondaryColor?: unknown;
  imageUrl?: unknown;
  name?: unknown;
  slug?: unknown;
};

function normalizeDomain(value: string | null) {
  if (!value) {
    return null;
  }

  const urlHost = hostFromUrl(value);

  if (urlHost) {
    return normalizeHost(urlHost);
  }

  return normalizeHost(value);
}

function resolveLookupDomain(domain: string) {
  if (
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    domain === "::1"
  ) {
    return normalizeDomain(LOCALHOST_DOMAIN_ALIAS) ?? domain;
  }

  return domain;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCustomizationData(value: unknown): CustomizationData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CustomizationData;
}

function domainNotFoundResponse() {
  return Response.json(
    { error: "Dominio nao encontrado.", code: "DOMAIN_NOT_FOUND" },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  const domain =
    normalizeDomain(request.nextUrl.searchParams.get("domain")) ??
    normalizeDomain(hostFromHeaders(request.headers));
  const lookupDomain = domain ? resolveLookupDomain(domain) : null;

  if (!lookupDomain) {
    return Response.json(
      { error: "Informe o dominio para consulta.", code: "DOMAIN_REQUIRED" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      customDomain: lookupDomain,
      customDomainVerifiedAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      customDomain: true,
      customDomainVerifiedAt: true,
      companySettings: {
        select: {
          legalName: true,
          tradeName: true,
          logoUrl: true,
        },
      },
      customization: {
        select: {
          data: true,
        },
      },
    },
  });

  if (!tenant) {
    return domainNotFoundResponse();
  }

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELED") {
    return domainNotFoundResponse();
  }

  const customization = parseCustomizationData(tenant.customization?.data);
  const title =
    getString(customization.name) ??
    tenant.companySettings?.tradeName ??
    tenant.companySettings?.legalName ??
    tenant.name;

  return Response.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    customDomain: tenant.customDomain,
    customDomainVerifiedAt: tenant.customDomainVerifiedAt,
    branding: {
      title,
      logoUrl: getString(customization.imageUrl) ?? tenant.companySettings?.logoUrl ?? null,
      primaryColor: normalizeHexColor(customization.primaryColor),
      secondaryColor: normalizeHexColor(customization.secondaryColor),
    },
  });
}
