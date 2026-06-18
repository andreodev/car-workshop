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
import {
  classifyTenantHost,
  hostFromHeaders,
  normalizeHost,
  type TenantHostKind,
  type TenantHostSignal,
} from "@/app/lib/tenant-host";

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

async function readTenantSignal(
  request?: NextRequest
): Promise<TenantHostSignal> {
  if (request) {
    const host = normalizeHost(
      request.headers.get(TENANT_HOST_HEADER) ?? hostFromHeaders(request.headers)
    );
    const classified = classifyTenantHost(host);

    return {
      host,
      kind:
        (request.headers.get(TENANT_HOST_KIND_HEADER) as TenantHostKind | null) ??
        classified.kind,
      slug: request.headers.get(TENANT_SLUG_HEADER) ?? classified.slug,
    };
  }

  const headerStore = await headers();
  const host = normalizeHost(
    headerStore.get(TENANT_HOST_HEADER) ?? hostFromHeaders(headerStore)
  );
  const classified = classifyTenantHost(host);

  return {
    host,
    kind:
      (headerStore.get(TENANT_HOST_KIND_HEADER) as TenantHostKind | null) ??
      classified.kind,
    slug: headerStore.get(TENANT_SLUG_HEADER) ?? classified.slug,
  };
}

async function getSelectedTenantId(request?: NextRequest) {
  const session = await getServerAuthSession();

  if (process.env.NODE_ENV !== "production") {
    const devTenantId =
      request?.headers.get("x-tenant-id") ??
      request?.nextUrl.searchParams.get("tenant") ??
      request?.nextUrl.searchParams.get("tenantId") ??
      null;

    if (devTenantId) {
      return devTenantId;
    }
  }

  const sessionSelectedTenantId =
    session?.selectedTenantId ??
    (session?.user as { selectedTenantId?: string | null } | undefined)
      ?.selectedTenantId ??
    null;

  if (sessionSelectedTenantId) {
    return sessionSelectedTenantId;
  }

  return null;
}

async function resolveTenantFromSignal(
  signal: TenantHostSignal,
  request?: NextRequest
) {
  if (signal.kind === "platform-root") {
    const selectedTenantId = await getSelectedTenantId(request);

    if (selectedTenantId) {
      return prisma.tenant.findUnique({
        where: { id: selectedTenantId },
      });
    }

    return null;
  }

  if (signal.kind === "tenant-subdomain" && signal.slug) {
    return prisma.tenant.findUnique({
      where: { slug: signal.slug },
    });
  }

  if (signal.kind === "custom-domain" && signal.host) {
    return prisma.tenant.findFirst({
      where: {
        customDomain: signal.host,
        customDomainVerifiedAt: { not: null },
      },
    });
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

export async function getTenantContext(
  request?: NextRequest
): Promise<TenantContext> {
  const signal = await readTenantSignal(request);
  const session = await getServerAuthSession();
  const resolvedTenant = await resolveTenantFromSignal(signal, request);
  const tenant = assertTenantIsUsable(resolvedTenant);

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
