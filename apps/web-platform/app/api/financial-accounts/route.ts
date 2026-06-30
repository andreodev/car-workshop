import type { NextRequest } from "next/server";
import {
  Prisma,
  type FinancialAccountStatus,
  type FinancialAccountType,
  type SalePaymentMethod,
} from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import { syncFinancialAccountCashMovement } from "./cash-sync";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const accountTypes = ["RECEBER", "PAGAR"] as const;
const accountStatuses = ["ABERTA", "PAGA", "VENCIDA", "CANCELADA"] as const;
const paymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "BOLETO",
  "OUTRO",
] as const;

type AccountTypeValue = (typeof accountTypes)[number];
type AccountStatusValue = (typeof accountStatuses)[number];
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

  if (!accountTypes.includes(normalized as AccountTypeValue)) {
    return null;
  }

  return normalized as FinancialAccountType;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || normalized === "TODOS") {
    return null;
  }

  if (!accountStatuses.includes(normalized as AccountStatusValue)) {
    return null;
  }

  return normalized as FinancialAccountStatus;
}

function buildDateRangeWhere(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function buildStatementPeriodWhere(
  from: Date | null,
  to: Date | null,
  status: FinancialAccountStatus | null
): Prisma.FinancialAccountWhereInput | null {
  if (!from && !to) {
    return null;
  }

  const dateRange = buildDateRangeWhere(from, to);

  if (status === "PAGA") {
    return {
      OR: [
        { paymentDate: dateRange },
        { paymentDate: null, dueDate: dateRange },
      ],
    };
  }

  if (status) {
    return { dueDate: dateRange };
  }

  return {
    OR: [
      {
        status: "PAGA",
        OR: [
          { paymentDate: dateRange },
          { paymentDate: null, dueDate: dateRange },
        ],
      },
      {
        status: { in: ["ABERTA", "VENCIDA", "CANCELADA"] },
        dueDate: dateRange,
      },
    ],
  };
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

async function validateCategoryName(
  tenantId: string,
  name: string | null,
  type: FinancialAccountType
) {
  if (!name) {
    return {
      error: Response.json({ error: "Categoria é obrigatória." }, { status: 400 }),
      categoryName: null,
    };
  }

  const compatibleTypes = type === "RECEBER" ? ["RECEITA", "AMBOS"] : ["DESPESA", "AMBOS"];
  const category = await prisma.financialCategory.findFirst({
    where: {
      tenantId,
      name: { equals: name, mode: "insensitive" },
      active: true,
      type: { in: compatibleTypes },
    },
    select: { name: true },
  });

  if (!category) {
    return {
      error: Response.json(
        {
          error:
            type === "RECEBER"
              ? "Selecione uma categoria ativa de receita."
              : "Selecione uma categoria ativa de despesa.",
        },
        { status: 400 }
      ),
      categoryName: null,
    };
  }

  return { error: null, categoryName: category.name };
}

async function normalizePaidSummary<
  TSummary extends Array<{
    type: FinancialAccountType;
    status: FinancialAccountStatus;
    _sum?: { amount?: unknown; paidAmount?: unknown } | null;
  }>,
>(summary: TSummary, where: Prisma.FinancialAccountWhereInput) {
  const paidAccounts = await prisma.financialAccount.findMany({
    where,
    select: {
      type: true,
      amount: true,
      paidAmount: true,
    },
  });
  const paidTotals = new Map<FinancialAccountType, Prisma.Decimal>();

  for (const account of paidAccounts) {
    const current = paidTotals.get(account.type) ?? new Prisma.Decimal(0);
    paidTotals.set(
      account.type,
      current.add(new Prisma.Decimal(account.paidAmount ?? account.amount))
    );
  }

  return summary.map((group) => {
    if (group.status !== "PAGA") {
      return group;
    }

    return {
      ...group,
      _sum: {
        ...(group._sum ?? {}),
        paidAmount:
          paidTotals.get(group.type)?.toFixed(2) ?? group._sum?.paidAmount,
      },
    };
  });
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
  const status = normalizeStatus(searchParams.get("status"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const where: Prisma.FinancialAccountWhereInput = {
    tenantId: tenant.tenantId,
  };

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  const periodWhere = buildStatementPeriodWhere(from, to, status);

  if (periodWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), periodWhere];
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { counterparty: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { documentNumber: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items, summary] = await prisma.$transaction([
    prisma.financialAccount.count({ where }),
    prisma.financialAccount.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, code: true, status: true } },
        supplierOrder: { select: { id: true, code: true, status: true } },
      },
      orderBy: [
        { paymentDate: "desc" },
        { dueDate: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      where,
      orderBy: [{ type: "asc" }, { status: "asc" }],
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
    }),
  ]);

  const shouldNormalizePaidSummary = !status || status === "PAGA";
  const normalizedSummary = shouldNormalizePaidSummary
    ? await normalizePaidSummary(summary, { ...where, status: "PAGA" })
    : summary;

  return Response.json({ items, total, page, pageSize, summary: normalizedSummary });
}

export async function POST(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const type = normalizeType(payload.type);
  const status = normalizeStatus(payload.status) ?? "ABERTA";
  const description = normalizeDescription(payload.description);
  const dueDate = normalizeDate(payload.dueDate);
  const paymentDate = normalizeDate(payload.paymentDate);
  const amount = normalizeMoney(payload.amount);
  const paidAmount = normalizeMoney(payload.paidAmount);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  const clientId = normalizeString(payload.clientId);
  const category = normalizeString(payload.category);

  if (!type) {
    return Response.json({ error: "Tipo de conta inválido." }, { status: 400 });
  }

  if (!description) {
    return Response.json({ error: "Descrição é obrigatória." }, { status: 400 });
  }

  if (!dueDate) {
    return Response.json({ error: "Vencimento inválido." }, { status: 400 });
  }

  if (amount === null || amount <= 0) {
    return Response.json({ error: "Valor deve ser maior que zero." }, { status: 400 });
  }

  if (paymentMethod === undefined) {
    return Response.json({ error: "Forma de pagamento invalida." }, { status: 400 });
  }

  const categoryValidation = await validateCategoryName(tenant.tenantId, category, type);
  if (categoryValidation.error) {
    return categoryValidation.error;
  }

  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!client) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
  }

  const account = await prisma.$transaction(async (tx) => {
    const createdAccount = await tx.financialAccount.create({
      data: {
        tenantId: tenant.tenantId,
        type,
        status,
        description,
        clientId,
        counterparty: normalizeString(payload.counterparty),
        category: categoryValidation.categoryName,
        documentNumber: normalizeString(payload.documentNumber),
        dueDate,
        paymentDate,
        amount,
        paidAmount: paidAmount ?? null,
        paymentMethod,
        notes: normalizeString(payload.notes),
      },
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, code: true, status: true } },
        supplierOrder: { select: { id: true, code: true, status: true } },
      },
    });

    await syncFinancialAccountCashMovement(tx, createdAccount.id, tenant.tenantId);

    return createdAccount;
  });

  return Response.json(account, { status: 201 });
}
