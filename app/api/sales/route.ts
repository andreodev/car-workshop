import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma, type SalePaymentMethod, type SaleStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const saleStatuses = ["CONCLUIDA", "CANCELADA"] as const;
const salePaymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "BOLETO",
  "OUTRO",
] as const;

type SaleStatusValue = (typeof saleStatuses)[number];
type SalePaymentMethodValue = (typeof salePaymentMethods)[number];
type ParsedSaleItem = {
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

class StockError extends Error {}

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

function normalizePaymentMethod(value: unknown) {
  const normalized = normalizeString(value) ?? "DINHEIRO";

  if (!salePaymentMethods.includes(normalized as SalePaymentMethodValue)) {
    return null;
  }

  return normalized as SalePaymentMethod;
}

function normalizeStatus(value: string | null) {
  if (!value || value === "TODOS") {
    return null;
  }

  if (!saleStatuses.includes(value as SaleStatusValue)) {
    return null;
  }

  return value as SaleStatus;
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

function defaultResponsible(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  return session?.user?.name ?? session?.user?.email ?? "Operador";
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

async function ensurePdvCategory(tx: Prisma.TransactionClient) {
  return tx.financialCategory.upsert({
    where: { name: "Vendas PDV" },
    update: { type: "RECEITA", active: true },
    create: { name: "Vendas PDV", type: "RECEITA" },
    select: { id: true },
  });
}

async function createSaleCashEntry(
  tx: Prisma.TransactionClient,
  sale: {
    id: string;
    code: number;
    total: Prisma.Decimal;
    paymentMethod: SalePaymentMethod;
    client?: { name: string } | null;
  }
) {
  if (new Prisma.Decimal(sale.total).lessThanOrEqualTo(0)) {
    return;
  }

  const category = await ensurePdvCategory(tx);

  await tx.cashMovement.create({
    data: {
      type: "ENTRADA",
      categoryId: category.id,
      saleId: sale.id,
      description: `Venda PDV #${sale.code}`,
      movementDate: new Date(),
      amount: sale.total,
      paymentMethod: sale.paymentMethod,
      documentNumber: `PDV-${sale.code}`,
      notes: sale.client?.name ? `Cliente: ${sale.client.name}` : "Caixa livre",
    },
  });
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
  const status = normalizeStatus(searchParams.get("status"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const where: Prisma.SaleWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { responsible: { contains: search, mode: "insensitive" } },
      { sectorName: { contains: search, mode: "insensitive" } },
      { sector: { name: { contains: search, mode: "insensitive" } } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      { items: { some: { description: { contains: search, mode: "insensitive" } } } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            catalogItem: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
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
  const clientId = normalizeString(payload.clientId);
  const sectorId = normalizeString(payload.sectorId);
  const responsible = normalizeString(payload.responsible) ?? defaultResponsible(session);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (!paymentMethod) {
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

  const sector = sectorId
    ? await prisma.sector.findUnique({
        where: { id: sectorId },
        select: { id: true, name: true, active: true },
      })
    : null;

  if (sectorId && !sector) {
    return Response.json({ error: "Setor não encontrado." }, { status: 404 });
  }

  if (sector && !sector.active) {
    return Response.json({ error: "Setor esta inativo." }, { status: 400 });
  }

  if (rawItems.length === 0) {
    return Response.json({ error: "Inclua pelo menos um item na venda." }, { status: 400 });
  }

  const items: ParsedSaleItem[] = [];

  for (const rawItem of rawItems) {
    const item = rawItem as Record<string, unknown>;
    const description = normalizeString(item.description);
    const quantity = normalizeNumber(item.quantity);
    const unitPrice = normalizeMoney(item.unitPrice);
    const discountPercent = normalizeMoney(item.discountPercent) ?? 0;
    const catalogItemId = normalizeString(item.catalogItemId);

    if (!description) {
      return Response.json({ error: "Descrição do item é obrigatória." }, { status: 400 });
    }

    if (!catalogItemId) {
      return Response.json(
        { error: "Selecione um produto ou serviço cadastrado para vender." },
        { status: 400 }
      );
    }

    if (quantity === null || quantity <= 0) {
      return Response.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
    }

    if (unitPrice === null) {
      return Response.json({ error: "Valor unitário inválido." }, { status: 400 });
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return Response.json({ error: "Desconto deve estar entre 0 e 100%." }, { status: 400 });
    }

    const grossTotal = quantity * unitPrice;
    const discount = Math.round(grossTotal * (discountPercent / 100) * 100) / 100;
    const total = Math.round((grossTotal - discount) * 100) / 100;

    items.push({
      catalogItemId,
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      unitPrice,
      discount,
      total,
    });
  }

  const catalogItemIds = items
    .map((item) => item.catalogItemId)
    .filter((value): value is string => Boolean(value));
  const uniqueCatalogItemIds = Array.from(new Set(catalogItemIds));
  const catalogItemsById = new Map<
    string,
    {
      id: string;
      name: string;
      type: "PRODUTO" | "SERVICO";
      stockCurrent: Prisma.Decimal | null;
    }
  >();

  if (uniqueCatalogItemIds.length > 0) {
    const foundItems = await prisma.catalogItem.findMany({
      where: { id: { in: uniqueCatalogItemIds } },
      select: { id: true, name: true, type: true, stockCurrent: true },
    });

    if (foundItems.length !== uniqueCatalogItemIds.length) {
      return Response.json({ error: "Produto da venda não encontrado." }, { status: 404 });
    }

    foundItems.forEach((item) => {
      catalogItemsById.set(item.id, item);
    });
  }

  const requestedStockByItem = new Map<string, Prisma.Decimal>();

  items.forEach((item) => {
    if (!item.catalogItemId) {
      return;
    }

    const catalogItem = catalogItemsById.get(item.catalogItemId);

    if (!catalogItem || catalogItem.type !== "PRODUTO") {
      return;
    }

    const currentRequested = requestedStockByItem.get(catalogItem.id) ?? new Prisma.Decimal(0);
    requestedStockByItem.set(
      catalogItem.id,
      currentRequested.add(new Prisma.Decimal(item.quantity))
    );
  });

  for (const [catalogItemId, requestedQuantity] of requestedStockByItem) {
    const catalogItem = catalogItemsById.get(catalogItemId);
    const currentStock = new Prisma.Decimal(catalogItem?.stockCurrent ?? 0);

    if (currentStock.lessThan(requestedQuantity)) {
      return Response.json(
        {
          error: `Estoque insuficiente para ${catalogItem?.name ?? "produto"}. Disponível: ${formatStock(currentStock)}. Solicitado: ${formatStock(requestedQuantity)}.`,
        },
        { status: 400 }
      );
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.total + item.discount, 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          clientId,
          sectorId,
          responsible,
          sectorName: sector?.name ?? null,
          paymentMethod,
          notes: normalizeString(payload.notes),
          subtotal: Math.round(subtotal * 100) / 100,
          discountTotal: Math.round(discountTotal * 100) / 100,
          total: Math.round(total * 100) / 100,
          items: {
            create: items.map((item) => ({
              catalogItemId: item.catalogItemId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
            })),
          },
        },
        include: {
          client: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              catalogItem: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
      });

      for (const item of createdSale.items) {
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
          data: {
            stockCurrent: { decrement: quantity },
          },
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
          saleId: createdSale.id,
          saleItemId: item.id,
          quantity,
            stockBefore: currentStock,
          stockAfter: updatedItem?.stockCurrent ?? null,
          reason: `Venda #${createdSale.code}`,
        });
      }

      await createSaleCashEntry(tx, createdSale);

      return createdSale;
    });

    return Response.json(sale, { status: 201 });
  } catch (error) {
    if (error instanceof StockError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
