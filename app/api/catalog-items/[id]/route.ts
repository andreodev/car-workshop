import type { NextRequest } from "next/server";
import { Prisma, type CatalogItemType } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const catalogItemTypes = ["PRODUTO", "SERVICO"] as const;

type CatalogItemTypeValue = (typeof catalogItemTypes)[number];
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

function normalizeMoney(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function normalizeType(value: unknown) {
  const normalized = normalizeString(value) ?? "PRODUTO";

  if (!catalogItemTypes.includes(normalized as CatalogItemTypeValue)) {
    return null;
  }

  return normalized as CatalogItemType;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.catalogItem.findUnique({ where: { id } });

  if (!item) {
    return Response.json({ error: "Produto ou servico nao encontrado." }, { status: 404 });
  }

  return Response.json(item);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);
  const type = normalizeType(payload.type);
  const unitPrice = normalizeMoney(payload.unitPrice);

  if (!name) {
    return Response.json({ error: "Nome e obrigatorio." }, { status: 400 });
  }

  if (!type) {
    return Response.json({ error: "Tipo invalido." }, { status: 400 });
  }

  if (unitPrice === null) {
    return Response.json({ error: "Valor unitario invalido." }, { status: 400 });
  }

  try {
    const item = await prisma.catalogItem.update({
      where: { id },
      data: {
        type,
        name,
        sku: normalizeString(payload.sku),
        unitPrice,
        active: payload.active === false ? false : true,
        notes: normalizeString(payload.notes),
      },
    });

    return Response.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Produto ou servico nao encontrado." }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
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
      return Response.json({ error: "Produto ou servico nao encontrado." }, { status: 404 });
    }

    throw error;
  }
}
