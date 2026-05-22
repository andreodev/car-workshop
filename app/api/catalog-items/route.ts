import type { NextRequest } from "next/server";
import { Prisma, type CatalogItemType } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const catalogItemTypes = ["PRODUTO", "SERVICO"] as const;

type CatalogItemTypeValue = (typeof catalogItemTypes)[number];

function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = coerceNumber(searchParams.get("page"), 1);
  const pageSize = Math.min(
    coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const search = normalizeString(searchParams.get("search")) ?? "";
  const type = normalizeString(searchParams.get("type"));
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where: Prisma.CatalogItemWhereInput = {};

  if (!includeInactive) {
    where.active = true;
  }

  if (type && catalogItemTypes.includes(type as CatalogItemTypeValue)) {
    where.type = type as CatalogItemType;
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.catalogItem.count({ where }),
    prisma.catalogItem.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return Response.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

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

  const item = await prisma.catalogItem.create({
    data: {
      type,
      name,
      sku: normalizeString(payload.sku),
      unitPrice,
      active: payload.active === false ? false : true,
      notes: normalizeString(payload.notes),
    },
  });

  return Response.json(item, { status: 201 });
}
