import type { NextRequest } from "next/server";
import {
  Prisma,
  type CashMovementType,
  type SalePaymentMethod,
} from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const movementTypes = ["ENTRADA", "SAIDA"] as const;
const paymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "BOLETO",
  "OUTRO",
] as const;

type MovementTypeValue = (typeof movementTypes)[number];
type PaymentMethodValue = (typeof paymentMethods)[number];

function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDescription(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  return `${normalized.charAt(0).toLocaleUpperCase("pt-BR")}${normalized.slice(1)}`;
}

function normalizeNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMoney(value: unknown) {
  const parsed = normalizeNumber(value);

  if (parsed === null || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDate(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = parseDateOnly(normalized) ?? new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateStart(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeType(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || normalized === "TODOS") {
    return null;
  }

  if (!movementTypes.includes(normalized as MovementTypeValue)) {
    return null;
  }

  return normalized as CashMovementType;
}

function normalizePaymentMethod(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  if (!paymentMethods.includes(normalized as PaymentMethodValue)) {
    return undefined;
  }

  return normalized as SalePaymentMethod;
}

async function validateCategoryId(
  tenantId: string,
  categoryId: string | null,
  type: CashMovementType
) {
  if (!categoryId) {
    return {
      error: Response.json({ error: "Categoria é obrigatória." }, { status: 400 }),
      categoryId: null,
    };
  }

  const compatibleTypes = type === "ENTRADA" ? ["RECEITA", "AMBOS"] : ["DESPESA", "AMBOS"];
  const category = await prisma.financialCategory.findFirst({
    where: {
      id: categoryId,
      tenantId,
      active: true,
      type: { in: compatibleTypes },
    },
    select: { id: true },
  });

  if (!category) {
    return {
      error: Response.json(
        {
          error:
            type === "ENTRADA"
              ? "Selecione uma categoria ativa de receita."
              : "Selecione uma categoria ativa de despesa.",
        },
        { status: 400 }
      ),
      categoryId: null,
    };
  }

  return { error: null, categoryId: category.id };
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
  const categoryId = normalizeString(searchParams.get("categoryId"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const where: Prisma.CashMovementWhereInput = {
    tenantId: tenant.tenantId,
  };

  if (type) {
    where.type = type;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (from || to) {
    where.movementDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { documentNumber: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
      ...(Number.isInteger(code) && code > 0 ? [{ sale: { code } }] : []),
      ...(Number.isInteger(code) && code > 0 ? [{ financialAccount: { code } }] : []),
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items, summary] = await prisma.$transaction([
    prisma.cashMovement.count({ where }),
    prisma.cashMovement.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, type: true } },
        sale: { select: { id: true, code: true, status: true } },
        financialAccount: { select: { id: true, code: true, type: true } },
      },
      orderBy: [{ movementDate: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashMovement.groupBy({
      by: ["type"],
      where,
      orderBy: { type: "asc" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return Response.json({ items, total, page, pageSize, summary });
}

export async function POST(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const type = normalizeType(payload.type);
  const description = normalizeDescription(payload.description);
  const movementDate = normalizeDate(payload.movementDate);
  const amount = normalizeMoney(payload.amount);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  const categoryId = normalizeString(payload.categoryId);

  if (!type) {
    return Response.json({ error: "Tipo de movimento inválido." }, { status: 400 });
  }

  if (!description) {
    return Response.json({ error: "Descrição é obrigatória." }, { status: 400 });
  }

  if (!movementDate) {
    return Response.json({ error: "Data inválida." }, { status: 400 });
  }

  if (amount === null || amount <= 0) {
    return Response.json({ error: "Valor deve ser maior que zero." }, { status: 400 });
  }

  if (paymentMethod === undefined) {
    return Response.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }

  const categoryValidation = await validateCategoryId(tenant.tenantId, categoryId, type);
  if (categoryValidation.error) {
    return categoryValidation.error;
  }

  const movement = await prisma.cashMovement.create({
    data: {
      tenantId: tenant.tenantId,
      type,
      categoryId: categoryValidation.categoryId,
      description,
      movementDate,
      amount,
      paymentMethod,
      documentNumber: normalizeString(payload.documentNumber),
      notes: normalizeString(payload.notes),
    },
    include: {
      category: { select: { id: true, name: true, type: true } },
      sale: { select: { id: true, code: true, status: true } },
      financialAccount: { select: { id: true, code: true, type: true } },
    },
  });

  return Response.json(movement, { status: 201 });
}
