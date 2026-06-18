export type TenantHostKind =
  | "platform-root"
  | "tenant-subdomain"
  | "custom-domain"
  | "unknown";

export type TenantHostSignal = {
  host: string | null;
  kind: TenantHostKind;
  slug: string | null;
};

export function normalizeHost(value: string | null | undefined) {
  const firstValue = value?.split(",")[0]?.trim().toLowerCase();

  if (!firstValue) {
    return null;
  }

  if (firstValue.startsWith("[")) {
    return firstValue.slice(1, firstValue.indexOf("]"));
  }

  return firstValue.split(":")[0] || null;
}

export function hostFromUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function platformRootDomains() {
  const domains = [
    process.env.PLATFORM_ROOT_DOMAIN,
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN,
    process.env.PLATFORM_APP_DOMAIN,
    process.env.NEXT_PUBLIC_PLATFORM_APP_DOMAIN,
    hostFromUrl(process.env.NEXTAUTH_URL),
    hostFromUrl(process.env.NEXT_PUBLIC_PLATFORM_BASE_URL),
    "localhost",
    "127.0.0.1",
  ];

  return new Set(
    domains
      .map((domain) => normalizeHost(domain))
      .filter((domain): domain is string => Boolean(domain))
  );
}

export function classifyTenantHost(host: string | null): TenantHostSignal {
  if (!host) {
    return { host: null, kind: "unknown", slug: null };
  }

  const rootDomains = platformRootDomains();

  if (rootDomains.has(host)) {
    return { host, kind: "platform-root", slug: null };
  }

  for (const rootDomain of rootDomains) {
    if (rootDomain && host.endsWith(`.${rootDomain}`)) {
      return {
        host,
        kind: "tenant-subdomain",
        slug: host.slice(0, -(rootDomain.length + 1)),
      };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const isLocalNetworkIp = /^192\.168\.\d+\.\d+$/.test(host);
    const isPrivateIp =
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host);

    if (isLocalNetworkIp || isPrivateIp) {
      return { host, kind: "platform-root", slug: null };
    }
  }

  return { host, kind: "custom-domain", slug: null };
}

export function hostFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeHost(
    headers.get("x-forwarded-host") ??
      headers.get("x-vercel-forwarded-host") ??
      headers.get("host")
  );
}
