import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const sector = await prisma.sector.findUnique({ where: { id } });

  if (!sector) {
    return Response.json({ error: "Setor não encontrado." }, { status: 404 });
  }

  return Response.json(sector);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const sector = await prisma.sector.update({
      where: { id },
      data: {
        name,
        active: payload.active === false ? false : true,
        notes: normalizeString(payload.notes),
      },
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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.sector.delete({ where: { id } });
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
