import { NextResponse, type NextRequest } from "next/server";

import {
  RESOLVED_TENANT_ID_HEADER,
  TENANT_HOST_HEADER,
  TENANT_HOST_KIND_HEADER,
  TENANT_SLUG_HEADER,
} from "@/app/lib/tenant-headers";

function normalizeHost(value: string | null) {
  return value?.split(":")[0]?.trim().toLowerCase() || "";
}

function platformRootDomains() {
  return new Set(
    [
      process.env.PLATFORM_ROOT_DOMAIN,
      process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN,
      "localhost",
      "127.0.0.1",
    ]
      .filter(Boolean)
      .map((domain) => domain?.toLowerCase())
  );
}

function classifyHost(host: string) {
  const rootDomains = platformRootDomains();

  if (!host || rootDomains.has(host)) {
    return { kind: "platform-root", slug: null };
  }

  for (const rootDomain of rootDomains) {
    if (rootDomain && host.endsWith(`.${rootDomain}`)) {
      return {
        kind: "tenant-subdomain",
        slug: host.slice(0, -(rootDomain.length + 1)),
      };
    }
  }

  return { kind: "custom-domain", slug: null };
}

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host"));
  const tenantSignal = classifyHost(host);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete(RESOLVED_TENANT_ID_HEADER);
  requestHeaders.set(TENANT_HOST_HEADER, host);
  requestHeaders.set(TENANT_HOST_KIND_HEADER, tenantSignal.kind);
  requestHeaders.delete(TENANT_SLUG_HEADER);

  if (tenantSignal.slug) {
    requestHeaders.set(TENANT_SLUG_HEADER, tenantSignal.slug);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
