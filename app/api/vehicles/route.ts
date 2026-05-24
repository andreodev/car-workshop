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
  const searchBy = normalizeString(searchParams.get("searchBy")) ?? "PLACA";
  const status = normalizeString(searchParams.get("status"));

  const where: Prisma.VehicleWhereInput = {};

  if (status && status !== "TODOS") {
    where.status = status as Prisma.VehicleStatus;
  }

  if (search) {
    switch (searchBy) {
      case "MARCA":
        where.brand = { contains: search, mode: "insensitive" };
        break;
      case "MODELO":
        where.model = { contains: search, mode: "insensitive" };
        break;
      case "CLIENTE":
        where.client = {
          name: { contains: search, mode: "insensitive" },
        };
        break;
      case "CODIGO": {
        const parsedCode = Number(search);
        if (!Number.isInteger(parsedCode)) {
          return Response.json({ items: [], total: 0, page, pageSize });
        }
        where.code = parsedCode;
        break;
      }
      default:
        where.plate = { contains: search, mode: "insensitive" };
        break;
    }
  }

  const [total, items] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
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

  const data: Prisma.VehicleCreateInput = {
    client: { connect: { id: clientId } },
    plate,
    brand: normalizeString(payload.brand),
    model: normalizeString(payload.model),
    version: normalizeString(payload.version),
    fleet: normalizeString(payload.fleet),
    fuel: fuel ? (fuel as Prisma.VehicleFuel) : null,
    color: normalizeString(payload.color),
    chassis: normalizeString(payload.chassis),
    renavam: normalizeString(payload.renavam),
    engine: normalizeString(payload.engine),
    city: normalizeString(payload.city),
    status: (status ?? "ATIVO") as Prisma.VehicleStatus,
    manufactureYear: manufactureYear?.value ?? null,
    modelYear: modelYear?.value ?? null,
    notes: normalizeString(payload.notes),
  };

  const vehicle = await prisma.vehicle.create({
    data,
    include: { client: { select: { id: true, name: true } } },
  });

  return Response.json(vehicle, { status: 201 });
}
