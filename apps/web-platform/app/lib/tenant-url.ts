type TenantUrlInput = {
  id: string;
  slug: string;
  customDomain?: string | null;
  customDomainVerifiedAt?: Date | string | null;
};

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalRootDomain(domain: string | undefined) {
  return !domain || domain === "localhost" || domain === "127.0.0.1";
}

export function buildTenantUrl(tenant: TenantUrlInput) {
  if (tenant.customDomain && tenant.customDomainVerifiedAt) {
    return `https://${tenant.customDomain}`;
  }

  const rootDomain =
    process.env.PLATFORM_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;

  if (process.env.NODE_ENV === "production" && !isLocalRootDomain(rootDomain)) {
    return `https://${tenant.slug}.${rootDomain}`;
  }

  if (!isLocalRootDomain(rootDomain)) {
    return `https://${tenant.slug}.${rootDomain}`;
  }

  const platformBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_PLATFORM_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ??
    "http://localhost:3000";

  const url = new URL(platformBaseUrl);
  url.searchParams.set("tenant", tenant.id);
  return url.toString();
}
