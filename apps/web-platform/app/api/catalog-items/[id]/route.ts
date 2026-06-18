import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import {
  buildCatalogItemData,
  normalizeMoney,
  normalizeString,
  normalizeType,
} from "../catalog-item-payload";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const item = await prisma.catalogItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
  });

  if (!item) {
    return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
  }

  return Response.json(item);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);
  const type = normalizeType(payload.type);
  const unitPrice = normalizeMoney(payload.unitPrice);

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  if (!type) {
    return Response.json({ error: "Tipo inválido." }, { status: 400 });
  }

  if (unitPrice === null) {
    return Response.json({ error: "Valor unitário inválido." }, { status: 400 });
  }

  const existingItem = await prisma.catalogItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existingItem) {
    return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
  }

  const data = buildCatalogItemData({ ...payload, type, name, unitPrice });

  if (data.sectorId) {
    const sector = await prisma.sector.findFirst({
      where: {
        active: true,
        id: data.sectorId,
        tenantId: tenant.tenantId,
      },
      select: { id: true },
    });

    if (!sector) {
      return Response.json(
        { error: "Setor não encontrado." },
        { status: 400 }
      );
    }
  }

  await prisma.catalogItem.updateMany({
    where: { id, tenantId: tenant.tenantId },
    data,
  });

  const item = await prisma.catalogItem.findFirstOrThrow({
    where: { id, tenantId: tenant.tenantId },
  });

  return Response.json(item);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const action = normalizeString(payload.action);

  if (action !== "ADD_STOCK") {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const quantity = normalizeMoney(payload.quantity);

  if (quantity === null || quantity <= 0) {
    return Response.json({ error: "Quantidade de estoque inválida." }, { status: 400 });
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      const catalogItem = await tx.catalogItem.findFirst({
        where: { id, tenantId: tenant.tenantId },
        select: { id: true, type: true, stockCurrent: true },
      });

      if (!catalogItem) {
        throw new Error("Produto ou serviço não encontrado.");
      }

      if (catalogItem.type !== "PRODUTO") {
        throw new Error("Apenas produtos controlam estoque.");
      }

      const stockBefore = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);
      const stockQuantity = new Prisma.Decimal(quantity);

      await tx.catalogItem.updateMany({
        where: { id, tenantId: tenant.tenantId },
        data: {
          stockCurrent:
            catalogItem.stockCurrent === null
              ? stockQuantity
              : { increment: stockQuantity },
        },
      });

      const updatedItem = await tx.catalogItem.findFirstOrThrow({
        where: { id, tenantId: tenant.tenantId },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: tenant.tenantId,
          type: "ENTRADA",
          catalogItemId: id,
          quantity: stockQuantity,
          stockBefore,
          stockAfter: updatedItem.stockCurrent,
          reason: "Entrada de estoque pela ordem de serviço",
          notes: normalizeString(payload.notes),
        },
      });

      return updatedItem;
    });

    return Response.json(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Produto ou serviço não encontrado.") {
      return Response.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Apenas produtos controlam estoque.") {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;

  const item = await prisma.catalogItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!item) {
    return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
  }

  await prisma.catalogItem.deleteMany({
    where: { id, tenantId: tenant.tenantId },
  });
  return Response.json({ ok: true });
}
