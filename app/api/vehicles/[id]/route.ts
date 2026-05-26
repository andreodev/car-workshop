import type { NextRequest } from "next/server";
import type { Prisma, VehicleFuel, VehicleStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseYear(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { error: "Ano inválido." };
  }

  return { value: parsed };
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

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  });

  if (!vehicle) {
    return Response.json({ error: "Veículo não encontrado." }, { status: 404 });
  }

  return Response.json(vehicle);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const plate = normalizeString(payload.plate);
  const clientId = normalizeString(payload.clientId);

  if (!plate) {
    return Response.json({ error: "Placa é obrigatória." }, { status: 400 });
  }

  if (!clientId) {
    return Response.json({ error: "Cliente é obrigatório." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });

  if (!client) {
    return Response.json({ error: "Cliente não encontrado." }, { status: 400 });
  }

  const manufactureYear = parseYear(payload.manufactureYear);
  if (manufactureYear?.error) {
    return Response.json({ error: manufactureYear.error }, { status: 400 });
  }

  const modelYear = parseYear(payload.modelYear);
  if (modelYear?.error) {
    return Response.json({ error: modelYear.error }, { status: 400 });
  }

  const fuel = normalizeString(payload.fuel);
  const status = normalizeString(payload.status);

  const data: Prisma.VehicleUpdateInput = {
    client: { connect: { id: clientId } },
    plate,
    brand: normalizeString(payload.brand),
    model: normalizeString(payload.model),
    version: normalizeString(payload.version),
    fleet: normalizeString(payload.fleet),
    fuel: fuel ? (fuel as VehicleFuel) : null,
    color: normalizeString(payload.color),
    chassis: normalizeString(payload.chassis),
    renavam: normalizeString(payload.renavam),
    engine: normalizeString(payload.engine),
    city: normalizeString(payload.city),
    status: (status ?? "ATIVO") as VehicleStatus,
    manufactureYear: manufactureYear?.value ?? null,
    modelYear: modelYear?.value ?? null,
    notes: normalizeString(payload.notes),
  };

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data,
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json(vehicle);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  await prisma.vehicle.delete({ where: { id } });

  return Response.json({ ok: true });
}
