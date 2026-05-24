import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const serviceOrderStatuses = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "IMPEDIDA",
  "FINALIZADA",
  "CANCELADA",
] as const;

type ServiceOrderStatusValue = (typeof serviceOrderStatuses)[number];

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseServiceOrderStatus(value: unknown) {
  const status = normalizeString(value) ?? "ABERTA";

  if (!serviceOrderStatuses.includes(status as ServiceOrderStatusValue)) {
    return { error: "Status da ordem de serviço inválido." };
  }

  return { value: status as ServiceOrderStatusValue };
}

function parsePositiveInt(value: unknown, fieldLabel: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = typeof value === "string" ? value.replace(",", ".") : String(value);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: Math.trunc(parsed) };
}

function parseDecimal(value: unknown, fieldLabel: string) {
  const normalized = typeof value === "string" ? value.replace(",", ".") : String(value ?? "");

  if (!normalized) {
    return { value: new Prisma.Decimal(0) };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: new Prisma.Decimal(parsed) };
}

function parseDateTime(value: unknown, fieldLabel: string) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return { error: `${fieldLabel} obrigatório.` };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldLabel} inválido.` };
  }

  return { value: parsed };
}

type ParsedItems = {
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
  }>;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  total: Prisma.Decimal;
};

function parseItems(payload: unknown) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: "Informe ao menos um item." };
  }

  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  const items: ParsedItems["items"] = [];

  for (const rawItem of payload) {
    if (!rawItem || typeof rawItem !== "object") {
      return { error: "Item inválido." };
    }

    const item = rawItem as Record<string, unknown>;
    const description = normalizeString(item.description);
    if (!description) {
      return { error: "Descrição do item é obrigatória." };
    }

    const quantityParsed = parsePositiveInt(item.quantity, "Quantidade");
    if (quantityParsed?.error) {
      return { error: quantityParsed.error };
    }

    const quantity = quantityParsed?.value ?? 0;
    if (quantity <= 0) {
      return { error: "Quantidade deve ser maior que zero." };
    }

    const unitPriceParsed = parseDecimal(item.unitPrice, "Valor unitario");
    if (unitPriceParsed.error) {
      return { error: unitPriceParsed.error };
    }

    const discountParsed = parseDecimal(item.discount, "Desconto");
    if (discountParsed.error) {
      return { error: discountParsed.error };
    }

    const unitPrice = unitPriceParsed.value;
    const discount = discountParsed.value;
    const quantityDecimal = new Prisma.Decimal(quantity);
    const lineSubtotal = unitPrice.mul(quantityDecimal);
    let lineTotal = lineSubtotal.minus(discount);
    if (lineTotal.lessThan(0)) {
      lineTotal = new Prisma.Decimal(0);
    }

    subtotal = subtotal.add(lineSubtotal);
    discountTotal = discountTotal.add(discount);

    items.push({
      description,
      quantity,
      unitPrice,
      discount,
      total: lineTotal,
    });
  }

  let total = subtotal.minus(discountTotal);
  if (total.lessThan(0)) {
    total = new Prisma.Decimal(0);
  }

  return { items, subtotal, discountTotal, total };
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      items: true,
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, model: true } },
      mechanic: { select: { id: true, name: true } },
      estimateConversion: { select: { id: true, code: true, status: true } },
    },
  });

  if (!order) {
    return Response.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
  }

  return Response.json(order);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const clientId = normalizeString(payload.clientId);
  const vehicleId = normalizeString(payload.vehicleId);
  const mechanicId = normalizeString(payload.mechanicId);
  const responsible =
    normalizeString(payload.responsible) ?? session.user?.name ?? session.user?.email;

  if (!clientId) {
    return Response.json({ error: "Cliente é obrigatório." }, { status: 400 });
  }

  if (!vehicleId) {
    return Response.json({ error: "Veículo é obrigatório." }, { status: 400 });
  }

  if (!mechanicId) {
    return Response.json({ error: "Mecânico é obrigatório." }, { status: 400 });
  }

  if (!responsible) {
    return Response.json({ error: "Responsável é obrigatório." }, { status: 400 });
  }

  const entryAt = parseDateTime(payload.entryAt, "Data de entrada");
  if (entryAt.error) {
    return Response.json({ error: entryAt.error }, { status: 400 });
  }

  const estimatedAtRaw = normalizeString(payload.estimatedAt);
  const estimatedAt = estimatedAtRaw ? parseDateTime(estimatedAtRaw, "Data prevista") : null;
  if (estimatedAt?.error) {
    return Response.json({ error: estimatedAt.error }, { status: 400 });
  }

  const kmParsed = parsePositiveInt(payload.km, "Km");
  if (kmParsed?.error) {
    return Response.json({ error: kmParsed.error }, { status: 400 });
  }

  const itemsParsed = parseItems(payload.items);
  if ("error" in itemsParsed) {
    return Response.json({ error: itemsParsed.error }, { status: 400 });
  }

  const status = parseServiceOrderStatus(payload.status);
  if (status.error) {
    return Response.json({ error: status.error }, { status: 400 });
  }

  const location = normalizeString(payload.location);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });

  if (!client) {
    return Response.json({ error: "Cliente não encontrado." }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, clientId: true },
  });

  if (!vehicle) {
    return Response.json({ error: "Veículo não encontrado." }, { status: 400 });
  }

  if (vehicle.clientId !== clientId) {
    return Response.json({ error: "Veículo nao pertence ao cliente." }, { status: 400 });
  }

  const mechanic = await prisma.mechanic.findUnique({
    where: { id: mechanicId },
    select: { id: true, active: true },
  });

  if (!mechanic) {
    return Response.json({ error: "Mecânico não encontrado." }, { status: 400 });
  }

  if (!mechanic.active) {
    return Response.json({ error: "Mecânico inativo." }, { status: 400 });
  }

  const order = await prisma.serviceOrder.update({
    where: { id },
    data: {
      client: { connect: { id: clientId } },
      vehicle: { connect: { id: vehicleId } },
      mechanic: { connect: { id: mechanicId } },
      responsible,
      status: status.value,
      location,
      km: kmParsed?.value ?? null,
      entryAt: entryAt.value,
      estimatedAt: estimatedAt?.value ?? null,
      notesInternal: normalizeString(payload.notesInternal),
      notesClient: normalizeString(payload.notesClient),
      subtotal: itemsParsed.subtotal,
      discountTotal: itemsParsed.discountTotal,
      total: itemsParsed.total,
      items: {
        deleteMany: {},
        create: itemsParsed.items,
      },
    },
    include: {
      items: true,
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, model: true } },
      mechanic: { select: { id: true, name: true } },
      estimateConversion: { select: { id: true, code: true, status: true } },
    },
  });

  return Response.json(order);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const status = parseServiceOrderStatus(payload.status);

  if (status.error) {
    return Response.json({ error: status.error }, { status: 400 });
  }

  const order = await prisma.serviceOrder.update({
    where: { id },
    data: { status: status.value },
    include: {
      items: true,
      client: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, model: true } },
      mechanic: { select: { id: true, name: true } },
      estimateConversion: { select: { id: true, code: true, status: true } },
    },
  });

  return Response.json(order);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  await prisma.serviceOrder.delete({ where: { id } });

  return Response.json({ ok: true });
}
