import type { NextRequest } from "next/server";
import {
  type CashMovementType,
  type SalePaymentMethod,
} from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

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

function normalizeType(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || !movementTypes.includes(normalized as MovementTypeValue)) {
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const movement = await prisma.cashMovement.findFirst({
    where: { id, tenantId: tenant.tenantId },
    include: {
      category: { select: { id: true, name: true, type: true } },
      sale: { select: { id: true, code: true, status: true } },
      financialAccount: { select: { id: true, code: true, type: true } },
    },
  });

  if (!movement) {
    return Response.json({ error: "Movimento de caixa não encontrado." }, { status: 404 });
  }

  return Response.json(movement);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const type = normalizeType(payload.type);
  const description = normalizeString(payload.description);
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

  if (categoryId) {
    const category = await prisma.financialCategory.findFirst({
      where: { id: categoryId, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!category) {
      return Response.json({ error: "Categoria não encontrada." }, { status: 404 });
    }
  }

  const existingMovement = await prisma.cashMovement.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existingMovement) {
    return Response.json({ error: "Movimento de caixa não encontrado." }, { status: 404 });
  }

  await prisma.cashMovement.updateMany({
    where: { id, tenantId: tenant.tenantId },
    data: {
      type,
      categoryId,
      description,
      movementDate,
      amount,
      paymentMethod,
      documentNumber: normalizeString(payload.documentNumber),
      notes: normalizeString(payload.notes),
    },
  });

  const movement = await prisma.cashMovement.findFirstOrThrow({
    where: { id, tenantId: tenant.tenantId },
    include: {
      category: { select: { id: true, name: true, type: true } },
      sale: { select: { id: true, code: true, status: true } },
      financialAccount: { select: { id: true, code: true, type: true } },
    },
  });

  return Response.json(movement);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);
  const { id } = await params;

  if (response) {
    return response;
  }

  const existingMovement = await prisma.cashMovement.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: {
      id: true,
      code: true,
      type: true,
      categoryId: true,
      saleId: true,
      financialAccountId: true,
      description: true,
      amount: true,
      paymentMethod: true,
      documentNumber: true,
      notes: true,
    },
  });

  if (!existingMovement) {
    return Response.json({ error: "Movimento de caixa não encontrado." }, { status: 404 });
  }

  if (existingMovement.saleId) {
    return Response.json(
      { error: "Cancele a venda de origem para estornar este movimento de caixa." },
      { status: 409 }
    );
  }

  if (existingMovement.financialAccountId) {
    return Response.json(
      { error: "Cancele a conta financeira de origem para estornar este movimento de caixa." },
      { status: 409 }
    );
  }

  const reversal = await prisma.cashMovement.create({
    data: {
      tenantId: tenant.tenantId,
      type: existingMovement.type === "ENTRADA" ? "SAIDA" : "ENTRADA",
      categoryId: existingMovement.categoryId,
      description: `Estorno movimento #${existingMovement.code}`,
      movementDate: new Date(),
      amount: existingMovement.amount,
      paymentMethod: existingMovement.paymentMethod,
      documentNumber: existingMovement.documentNumber,
      notes: existingMovement.notes
        ? `${existingMovement.notes}\nEstorno referente ao movimento #${existingMovement.code}: ${existingMovement.description}`
        : `Estorno referente ao movimento #${existingMovement.code}: ${existingMovement.description}`,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, reversalId: reversal.id });
}
