"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { prisma } from "@/app/lib/prisma";

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

async function resolveSignupTenantId() {
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

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return { error: "E-mail ja cadastrado." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const tenantId = await resolveSignupTenantId();

  if (!tenantId) {
    return {
      error:
        "Empresa de cadastro não configurada. Defina SIGNUP_TENANT_ID no ambiente.",
    };
  }

  await createUserAccess({
    email,
    name,
    passwordHash,
    tenantId,
  });

  redirect("/login");
}
