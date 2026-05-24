import type { NextRequest } from "next/server";
import {
  Prisma,
  type FinancialAccountStatus,
  type FinancialAccountType,
  type SalePaymentMethod,
} from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

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

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function normalizeDate(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateStart(value: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T23:59:59.999`);
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
  const type = normalizeType(searchParams.get("type"));
  const status = normalizeStatus(searchParams.get("status"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const where: Prisma.FinancialAccountWhereInput = {};

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (from || to) {
    where.dueDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
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
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { code: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financialAccount.groupBy({
      by: ["type", "status"],
      where,
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
    }),
  ]);

  return Response.json({ items, total, page, pageSize, summary });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const type = normalizeType(payload.type);
  const status = normalizeStatus(payload.status) ?? "ABERTA";
  const description = normalizeString(payload.description);
  const dueDate = normalizeDate(payload.dueDate);
  const paymentDate = normalizeDate(payload.paymentDate);
  const amount = normalizeMoney(payload.amount);
  const paidAmount = normalizeMoney(payload.paidAmount);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  const clientId = normalizeString(payload.clientId);

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

  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
  }

  const account = await prisma.financialAccount.create({
    data: {
      type,
      status,
      description,
      clientId,
      counterparty: normalizeString(payload.counterparty),
      category: normalizeString(payload.category),
      documentNumber: normalizeString(payload.documentNumber),
      dueDate,
      paymentDate,
      amount,
      paidAmount: paidAmount ?? null,
      paymentMethod,
      notes: normalizeString(payload.notes),
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json(account, { status: 201 });
}
