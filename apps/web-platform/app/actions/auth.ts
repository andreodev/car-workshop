"use server";

import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/app/lib/prisma";

export type SignupState = {
  error?: string;
};

const MAX_SLUG_BASE_LENGTH = 48;

function normalizeTenantSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");

  return slug || "oficina";
}

async function buildUniqueTenantSlug(
  tx: Prisma.TransactionClient,
  companyName: string
) {
  const baseSlug = normalizeTenantSlug(companyName);

  for (let suffix = 0; suffix < 20; suffix += 1) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const existingTenant = await tx.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existingTenant) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!companyName) {
    return { error: "Nome da oficina é obrigatório." };
  }

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

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
      },
      select: { id: true },
    });
    const slug = await buildUniqueTenantSlug(tx, companyName);
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug,
        status: "TRIAL",
      },
      select: { id: true },
    });

    await tx.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "OWNER",
        isActive: true,
      },
    });
  });

  redirect("/login");
}
