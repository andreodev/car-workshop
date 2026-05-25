import type { NextRequest } from "next/server";
import {
  type FinancialAccountStatus,
  type FinancialAccountType,
  type SalePaymentMethod,
} from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { syncFinancialAccountCashMovement } from "../cash-sync";

export const dynamic = "force-dynamic";

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

function normalizeType(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || !accountTypes.includes(normalized as AccountTypeValue)) {
    return null;
  }

  return normalized as FinancialAccountType;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || !accountStatuses.includes(normalized as AccountStatusValue)) {
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      serviceOrder: { select: { id: true, code: true, status: true } },
      supplierOrder: { select: { id: true, code: true, status: true } },
    },
  });

  if (!account) {
    return Response.json({ error: "Conta financeira não encontrada." }, { status: 404 });
  }

  return Response.json(account);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

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

  const account = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.financialAccount.update({
      where: { id },
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
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, code: true, status: true } },
        supplierOrder: { select: { id: true, code: true, status: true } },
      },
    });

    await syncFinancialAccountCashMovement(tx, id);

    return updatedAccount;
  });

  return Response.json(account);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const status = normalizeStatus(payload.status);

  if (!status) {
    return Response.json({ error: "Status inválido." }, { status: 400 });
  }

  const existing = await prisma.financialAccount.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      type: true,
      amount: true,
      description: true,
      category: true,
      documentNumber: true,
      paymentMethod: true,
    },
  });

  if (!existing) {
    return Response.json({ error: "Conta financeira não encontrada." }, { status: 404 });
  }

  const account = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.financialAccount.update({
      where: { id },
      data: {
        status,
        paymentDate: status === "PAGA" ? new Date() : null,
        paidAmount: status === "PAGA" ? existing.amount : null,
      },
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, code: true, status: true } },
        supplierOrder: { select: { id: true, code: true, status: true } },
      },
    });

    await syncFinancialAccountCashMovement(tx, id);

    return updatedAccount;
  });

  return Response.json(account);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const existingAccount = await prisma.financialAccount.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingAccount) {
    return Response.json({ error: "Conta financeira não encontrada." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.financialAccount.update({
      where: { id },
      data: {
        status: "CANCELADA",
        paymentDate: null,
        paidAmount: null,
      },
    });

    await syncFinancialAccountCashMovement(tx, id);
  });

  return Response.json({ ok: true });
}
