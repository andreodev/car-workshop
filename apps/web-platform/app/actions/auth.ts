"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
} from "@/app/lib/tenant-host";

export type SignupState = {
  error?: string;
};

const DEFAULT_SIGNUP_TENANT_SLUG = "oficina-principal";

function getConfiguredSignupTenantId() {
  return (
    process.env.SIGNUP_TENANT_ID ??
    process.env.DEFAULT_TENANT_ID ??
    process.env.TENANT_ID ??
    null
  );
}

async function readSignupTenantSignal() {
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

async function resolveSignupTenantId() {
  const signal = await readSignupTenantSignal();

  if (signal.kind === "tenant-subdomain" && signal.slug) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        slug: signal.slug,
        status: { in: ["TRIAL", "ACTIVE"] },
      },
      select: { id: true },
    });

    return tenant?.id ?? null;
  }

  if (signal.kind === "custom-domain" && signal.host) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        customDomain: signal.host,
        customDomainVerifiedAt: { not: null },
        status: { in: ["TRIAL", "ACTIVE"] },
      },
      select: { id: true },
    });

    return tenant?.id ?? null;
  }

  const configuredTenantId = getConfiguredSignupTenantId();

  if (configuredTenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: configuredTenantId,
        status: { in: ["TRIAL", "ACTIVE"] },
      },
      select: { id: true },
    });

    return tenant?.id ?? null;
  }

  const defaultTenant = await prisma.tenant.findFirst({
    where: {
      slug: DEFAULT_SIGNUP_TENANT_SLUG,
      status: { in: ["TRIAL", "ACTIVE"] },
    },
    select: { id: true },
  });

  if (defaultTenant) {
    return defaultTenant.id;
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE"] },
    },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });

  if (tenants.length === 1) {
    return tenants[0].id;
  }

  return null;
}

async function createUserAccess(params: {
  email: string;
  name: string;
  passwordHash: string;
  tenantId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: params.name || null,
        email: params.email,
        passwordHash: params.passwordHash,
      },
      select: { id: true },
    });

    await tx.tenantUser.create({
      data: {
        tenantId: params.tenantId,
        userId: user.id,
        role: "STAFF",
        isActive: true,
      },
    });
  });
}

async function addExistingUserTenantAccess(params: {
  userId: string;
  tenantId: string;
}) {
  const existingMembership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId: params.tenantId,
        userId: params.userId,
      },
    },
    select: {
      isActive: true,
    },
  });

  if (existingMembership?.isActive) {
    return { error: "E-mail ja cadastrado nesta empresa." };
  }

  if (existingMembership) {
    return { error: "Este acesso esta inativo nesta empresa." };
  }

  await prisma.tenantUser.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      role: "STAFF",
      isActive: true,
    },
  });

  return { error: undefined };
}

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const tenantId = await resolveSignupTenantId();

  if (!tenantId) {
    return {
      error:
        "Empresa de cadastro não configurada. Defina SIGNUP_TENANT_ID no ambiente.",
    };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (!existingUser.passwordHash) {
      return { error: "E-mail ja cadastrado. Entre com sua conta existente." };
    }

    const passwordMatches = await bcrypt.compare(
      password,
      existingUser.passwordHash
    );

    if (!passwordMatches) {
      return { error: "E-mail ja cadastrado. Confira a senha informada." };
    }

    const result = await addExistingUserTenantAccess({
      userId: existingUser.id,
      tenantId,
    });

    if (result.error) {
      return result;
    }

    redirect("/login");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await createUserAccess({
    email,
    name,
    passwordHash,
    tenantId,
  });

  redirect("/login");
}
