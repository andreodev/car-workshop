import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

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

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = coerceNumber(searchParams.get("page"), 1);
  const pageSize = Math.min(
    coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const search = normalizeString(searchParams.get("search")) ?? "";
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where: Prisma.SectorWhereInput = {};

  if (!includeInactive) {
    where.active = true;
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.sector.count({ where }),
    prisma.sector.findMany({
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
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const sector = await prisma.sector.create({
      data: {
        name,
        active: payload.active === false ? false : true,
        notes: normalizeString(payload.notes),
      },
    });

    return Response.json(sector, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "Ja existe um setor com este nome." }, { status: 409 });
    }

    throw error;
  }
}
