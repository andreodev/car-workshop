import type { NextRequest } from "next/server";
import { type FinancialCategoryType } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const categoryTypes = ["RECEITA", "DESPESA", "AMBOS"] as const;

type CategoryTypeValue = (typeof categoryTypes)[number];
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return null;
}

function normalizeType(value: unknown) {
  const normalized = normalizeString(value) ?? "AMBOS";

  if (!categoryTypes.includes(normalized as CategoryTypeValue)) {
    return null;
  }

  return normalized as FinancialCategoryType;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const category = await prisma.financialCategory.findFirst({
    where: { id, tenantId: tenant.tenantId },
  });

  if (!category) {
    return Response.json({ error: "Categoria financeira não encontrada." }, { status: 404 });
  }

  return Response.json(category);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);
  const type = normalizeType(payload.type);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  if (!type) {
    return Response.json({ error: "Tipo de categoria inválido." }, { status: 400 });
  }

  const existing = await prisma.financialCategory.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: "Categoria financeira não encontrada." }, { status: 404 });
  }

  await prisma.financialCategory.updateMany({
    where: { id, tenantId: tenant.tenantId },
    data: {
      name,
      type,
      active: normalizeBoolean(payload.active) ?? true,
      notes: normalizeString(payload.notes),
    },
  });

  const category = await prisma.financialCategory.findFirstOrThrow({
    where: { id, tenantId: tenant.tenantId },
  });

  return Response.json(category);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const active = normalizeBoolean(payload.active);

  if (active === null) {
    return Response.json({ error: "Situação inválida." }, { status: 400 });
  }

  const existing = await prisma.financialCategory.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: "Categoria financeira não encontrada." }, { status: 404 });
  }

  await prisma.financialCategory.updateMany({
    where: { id, tenantId: tenant.tenantId },
    data: { active },
  });

  const category = await prisma.financialCategory.findFirstOrThrow({
    where: { id, tenantId: tenant.tenantId },
  });

  return Response.json(category);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const existing = await prisma.financialCategory.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: "Categoria financeira não encontrada." }, { status: 404 });
  }

  await prisma.financialCategory.deleteMany({
    where: { id, tenantId: tenant.tenantId },
  });

  return Response.json({ ok: true });
}
