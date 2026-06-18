import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { mechanicFormSchema, toNullableString } from "@/app/(app)/mecanicos/mechanic-form-schema";
import { apiErrorResponse } from "@/app/api/_utils/api-error";
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

function getZodErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

const mechanicSelect = {
  id: true,
  code: true,
  name: true,
  active: true,
  commissionPercent: true,
  paymentKey: true,
  paymentKeyHolder: true,
  paymentBank: true,
  paymentKeyType: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MechanicSelect;

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

  const where: Prisma.MechanicWhereInput = {};

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

  try {
    const [total, items] = await prisma.$transaction([
      prisma.mechanic.count({ where }),
      prisma.mechanic.findMany({
        where,
        select: mechanicSelect,
        orderBy: [{ active: "desc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json({ items, total, page, pageSize });
  } catch (error) {
    return apiErrorResponse(error, {
      fallback: "Não foi possível carregar os mecânicos.",
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido.", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = mechanicFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const mechanic = await prisma.mechanic.create({
      data: {
        name: parsed.data.name,
        active: parsed.data.active,
        commissionPercent: parsed.data.commissionPercent,
        paymentKey: toNullableString(parsed.data.paymentKey),
        paymentKeyHolder: toNullableString(parsed.data.paymentKeyHolder),
        paymentBank: toNullableString(parsed.data.paymentBank),
        paymentKeyType: toNullableString(parsed.data.paymentKeyType),
        notes: toNullableString(parsed.data.notes),
      },
    });

    return Response.json(mechanic, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, {
      fallback: "Não foi possível cadastrar o mecânico.",
      uniqueMessage: "Já existe um mecânico com este nome.",
    });
  }
}
