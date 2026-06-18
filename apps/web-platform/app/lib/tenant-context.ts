import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { Tenant, TenantRole } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import {
  TENANT_HOST_HEADER,
  TENANT_HOST_KIND_HEADER,
  TENANT_SLUG_HEADER,
} from "@/app/lib/tenant-headers";

type TenantHostKind = "platform-root" | "tenant-subdomain" | "custom-domain" | "unknown";

type ResolvedTenantSignal = {
  host: string | null;
  kind: TenantHostKind;
  slug: string | null;
};

export type TenantContext = {
  tenantId: string;
  tenant: Tenant;
  userId: string | null;
};

export type TenantMembershipContext = TenantContext & {
  userId: string;
  role: TenantRole;
};

export class TenantAccessError extends Error {
  constructor(
    public readonly status: 401 | 403 | 404,
    message: string
  ) {
    super(message);
    this.name = "TenantAccessError";
  }
}

function normalizeHost(value: string | null) {
  return value?.split(":")[0]?.trim().toLowerCase() || null;
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

function classifyHost(host: string | null): ResolvedTenantSignal {
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

  return { host, kind: "custom-domain", slug: null };
}

async function readTenantSignal(request?: NextRequest): Promise<ResolvedTenantSignal> {
  if (request) {
    const host = normalizeHost(
      request.headers.get(TENANT_HOST_HEADER) ?? request.headers.get("host")
    );

    return {
      host,
      kind: (request.headers.get(TENANT_HOST_KIND_HEADER) as TenantHostKind | null) ?? classifyHost(host).kind,
      slug: request.headers.get(TENANT_SLUG_HEADER) ?? classifyHost(host).slug,
    };
  }

  const headerStore = await headers();
  const host = normalizeHost(
    headerStore.get(TENANT_HOST_HEADER) ?? headerStore.get("host")
  );

  return {
    host,
    kind: (headerStore.get(TENANT_HOST_KIND_HEADER) as TenantHostKind | null) ?? classifyHost(host).kind,
    slug: headerStore.get(TENANT_SLUG_HEADER) ?? classifyHost(host).slug,
  };
}

async function resolveTenantFromSignal(signal: ResolvedTenantSignal, request?: NextRequest) {
  if (signal.kind === "custom-domain" && signal.host) {
    return prisma.tenant.findFirst({
      where: {
        customDomain: signal.host,
        customDomainVerifiedAt: { not: null },
      },
    });
  }

  if (signal.kind === "tenant-subdomain" && signal.slug) {
    return prisma.tenant.findUnique({ where: { slug: signal.slug } });
  }

  if (signal.kind === "platform-root") {
    const session = await getServerAuthSession();
    const selectedTenantId = session?.selectedTenantId ?? null;

    if (selectedTenantId) {
      return prisma.tenant.findUnique({ where: { id: selectedTenantId } });
    }

    if (process.env.NODE_ENV !== "production") {
      const devTenantId =
        request?.headers.get("x-tenant-id") ??
        request?.nextUrl.searchParams.get("tenant") ??
        null;

      if (devTenantId) {
        return prisma.tenant.findUnique({ where: { id: devTenantId } });
      }
    }
  }

  return null;
}

function assertTenantIsUsable(tenant: Tenant | null): Tenant {
  if (!tenant) {
    throw new TenantAccessError(404, "Tenant not found");
  }

  if (tenant.status === "SUSPENDED") {
    throw new TenantAccessError(403, "Tenant suspended");
  }

  if (tenant.status === "CANCELED") {
    throw new TenantAccessError(403, "Tenant canceled");
  }

  return tenant;
}

export async function getTenantContext(request?: NextRequest): Promise<TenantContext | null> {
  const signal = await readTenantSignal(request);
  const tenant = assertTenantIsUsable(await resolveTenantFromSignal(signal, request));
  const session = await getServerAuthSession();

  return {
    tenantId: tenant.id,
    tenant,
    userId: session?.user?.id ?? null,
  };
}

export async function requireTenantMembership(
  request?: NextRequest
): Promise<TenantMembershipContext> {
  const context = await getTenantContext(request);

  if (!context) {
    throw new TenantAccessError(404, "Tenant not found");
  }

  if (!context.userId) {
    throw new TenantAccessError(401, "Authentication required");
  }

  const membership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId: context.tenantId,
        userId: context.userId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!membership?.isActive) {
    throw new TenantAccessError(403, "Tenant membership required");
  }

  return {
    ...context,
    userId: context.userId,
    role: membership.role,
  };
}

export async function requireMasterAdmin() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new TenantAccessError(401, "Authentication required");
  }

  const masterAdmin = await prisma.masterAdmin.findUnique({
    where: { userId: session.user.id },
  });

  if (!masterAdmin) {
    throw new TenantAccessError(403, "Master admin required");
  }

  return {
    userId: session.user.id,
    masterAdmin,
  };
}
