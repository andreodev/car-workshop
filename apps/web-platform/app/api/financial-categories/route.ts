import type { NextRequest } from "next/server";
import { Prisma, type FinancialCategoryType } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const categoryTypes = ["RECEITA", "DESPESA", "AMBOS"] as const;

type CategoryTypeValue = (typeof categoryTypes)[number];

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

export async function GET(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const page = coerceNumber(searchParams.get("page"), 1);
  const pageSize = Math.min(
    coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const search = normalizeString(searchParams.get("search")) ?? "";
  const type = normalizeType(searchParams.get("type"));
  const active = normalizeBoolean(searchParams.get("active"));

  const where: Prisma.FinancialCategoryWhereInput = {
    tenantId: tenant.tenantId,
  };

  if (type && type !== "AMBOS") {
    where.OR = [{ type }, { type: "AMBOS" }];
  }

  if (active !== null) {
    where.active = active;
  }

  if (search) {
    const code = Number(search);
    where.AND = [
      ...(where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : []),
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
          ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
        ],
      },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.financialCategory.count({ where }),
    prisma.financialCategory.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return Response.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

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

  const category = await prisma.financialCategory.create({
    data: {
      tenantId: tenant.tenantId,
      name,
      type,
      active: normalizeBoolean(payload.active) ?? true,
      notes: normalizeString(payload.notes),
    },
  });

  return Response.json(category, { status: 201 });
}
