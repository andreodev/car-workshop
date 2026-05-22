import type { NextRequest } from "next/server";
import { Prisma, type SaleStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const saleStatuses = ["CONCLUIDA", "CANCELADA"] as const;

type SaleStatusValue = (typeof saleStatuses)[number];

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized || !saleStatuses.includes(normalized as SaleStatusValue)) {
    return null;
  }

  return normalized as SaleStatus;
}

const saleInclude = {
  client: { select: { id: true, name: true } },
  sector: { select: { id: true, name: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      catalogItem: { select: { id: true, code: true, name: true, type: true } },
    },
  },
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });

  if (!sale) {
    return Response.json({ error: "Venda nao encontrada." }, { status: 404 });
  }

  return Response.json(sale);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const status = normalizeStatus(payload.status);

  if (!status) {
    return Response.json({ error: "Status invalido." }, { status: 400 });
  }

  try {
    const sale = await prisma.sale.update({
      where: { id },
      data: { status },
      include: saleInclude,
    });

    return Response.json(sale);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Venda nao encontrada." }, { status: 404 });
    }

    throw error;
  }
}
