import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import {
  buildCatalogItemData,
  normalizeMoney,
  normalizeString,
  normalizeType,
} from "../catalog-item-payload";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.catalogItem.findUnique({ where: { id } });

  if (!item) {
    return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
  }

  return Response.json(item);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);
  const type = normalizeType(payload.type);
  const unitPrice = normalizeMoney(payload.unitPrice);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  if (!type) {
    return Response.json({ error: "Tipo inválido." }, { status: 400 });
  }

  if (unitPrice === null) {
    return Response.json({ error: "Valor unitário inválido." }, { status: 400 });
  }

  try {
    const item = await prisma.catalogItem.update({
      where: { id },
      data: buildCatalogItemData({ ...payload, type, name, unitPrice }),
    });

    return Response.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
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
    await prisma.catalogItem.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
    }

    throw error;
  }
}
