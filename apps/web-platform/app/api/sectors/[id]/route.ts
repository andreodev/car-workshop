import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const sector = await prisma.sector.findFirst({
    where: { id, tenantId: tenant.tenantId },
  });

  if (!sector) {
    return Response.json({ error: "Setor não encontrado." }, { status: 404 });
  }

  return Response.json(sector);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const existing = await prisma.sector.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    await prisma.sector.updateMany({
      where: { id, tenantId: tenant.tenantId },
      data: {
        name,
        active: payload.active === false ? false : true,
        notes: normalizeString(payload.notes),
      },
    });

    const sector = await prisma.sector.findFirstOrThrow({
      where: { id, tenantId: tenant.tenantId },
    });

    return Response.json(sector);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "Ja existe um setor com este nome." }, { status: 409 });
    }

    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;

  try {
    const existing = await prisma.sector.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    await prisma.sector.deleteMany({
      where: { id, tenantId: tenant.tenantId },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Setor não encontrado." }, { status: 404 });
    }

    throw error;
  }
}
