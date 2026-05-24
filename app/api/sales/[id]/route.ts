import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma, type SaleStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const saleStatuses = ["CONCLUIDA", "CANCELADA"] as const;

type SaleStatusValue = (typeof saleStatuses)[number];

class StockError extends Error {}

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

function formatStock(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
    : "0";
}

type StockMovementData = {
  type: "ENTRADA" | "SAIDA" | "ESTORNO" | "AJUSTE";
  catalogItemId: string;
  saleId: string | null;
  saleItemId: string | null;
  quantity: Prisma.Decimal;
  stockBefore: Prisma.Decimal | null;
  stockAfter: Prisma.Decimal | null;
  reason: string;
  notes?: string | null;
};

type StockMovementWriter = {
  stockMovement?: {
    create(args: { data: StockMovementData }): Promise<unknown>;
  };
  $executeRaw(
    query: TemplateStringsArray,
    ...values: Array<string | Prisma.Decimal | null>
  ): Promise<unknown>;
};

async function createStockMovement(
  tx: StockMovementWriter,
  data: StockMovementData
) {
  if (tx.stockMovement) {
    await tx.stockMovement.create({ data });
    return;
  }

  await tx.$executeRaw`
    INSERT INTO "StockMovement" (
      "id",
      "type",
      "catalogItemId",
      "saleId",
      "saleItemId",
      "quantity",
      "stockBefore",
      "stockAfter",
      "reason",
      "notes",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${data.type}::"StockMovementType",
      ${data.catalogItemId},
      ${data.saleId},
      ${data.saleItemId},
      ${data.quantity},
      ${data.stockBefore},
      ${data.stockAfter},
      ${data.reason},
      ${data.notes ?? null},
      CURRENT_TIMESTAMP
    )
  `;
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

const saleStockInclude = {
  items: {
    include: {
      catalogItem: { select: { id: true, name: true, type: true, stockCurrent: true } },
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
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });

  if (!sale) {
    return Response.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  return Response.json(sale);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const status = normalizeStatus(payload.status);

  if (!status) {
    return Response.json({ error: "Status inválido." }, { status: 400 });
  }

  const currentSale = await prisma.sale.findUnique({
    where: { id },
    include: saleStockInclude,
  });

  if (!currentSale) {
    return Response.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  if (currentSale.status === status) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });

    return Response.json(sale);
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      for (const item of currentSale.items) {
        if (!item.catalogItemId || item.catalogItem?.type !== "PRODUTO") {
          continue;
        }

        const catalogItem = await tx.catalogItem.findUnique({
          where: { id: item.catalogItemId },
          select: { id: true, name: true, stockCurrent: true },
        });

        if (!catalogItem) {
          continue;
        }

        const quantity = new Prisma.Decimal(item.quantity);
        const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);

        if (status === "CANCELADA") {
          if (catalogItem.stockCurrent === null) {
            await tx.catalogItem.update({
              where: { id: catalogItem.id },
              data: { stockCurrent: quantity },
            });
          } else {
            await tx.catalogItem.update({
              where: { id: catalogItem.id },
              data: { stockCurrent: { increment: quantity } },
            });
          }

          const updatedItem = await tx.catalogItem.findUnique({
            where: { id: catalogItem.id },
            select: { stockCurrent: true },
          });

          await createStockMovement(tx, {
            type: "ESTORNO",
            catalogItemId: catalogItem.id,
            saleId: currentSale.id,
            saleItemId: item.id,
            quantity,
            stockBefore: currentStock,
            stockAfter: updatedItem?.stockCurrent ?? null,
            reason: `Cancelamento da venda #${currentSale.code}`,
          });

          continue;
        }

        if (status === "CONCLUIDA") {
          if (currentStock.lessThan(quantity)) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(currentStock)}. Solicitado: ${formatStock(quantity)}.`
            );
          }

          const updateResult = await tx.catalogItem.updateMany({
            where: {
              id: catalogItem.id,
              stockCurrent: { not: null, gte: quantity },
            },
            data: { stockCurrent: { decrement: quantity } },
          });

          if (updateResult.count !== 1) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Atualize a venda e tente novamente.`
            );
          }

          const updatedItem = await tx.catalogItem.findUnique({
            where: { id: catalogItem.id },
            select: { stockCurrent: true },
          });

          await createStockMovement(tx, {
            type: "SAIDA",
            catalogItemId: catalogItem.id,
            saleId: currentSale.id,
            saleItemId: item.id,
            quantity,
              stockBefore: currentStock,
            stockAfter: updatedItem?.stockCurrent ?? null,
            reason: `Reativação da venda #${currentSale.code}`,
          });
        }
      }

      return tx.sale.update({
        where: { id },
        data: { status },
        include: saleInclude,
      });
    });

    return Response.json(sale);
  } catch (error) {
    if (error instanceof StockError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
