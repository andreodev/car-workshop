import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import {
  saleListInclude,
  createPaymentCashMovements,
  ensurePdvCategory,
  ensureServiceOrderCategory,
  salePaymentInclude,
  saleRepository,
} from "../repositories/sale.repository";
import {
  coerceNumber,
  formatStock,
  getNextWeeklyPaymentDate,
  normalizeDateEnd,
  normalizeDateStart,
  normalizeMoney,
  normalizeNumber,
  normalizePaymentsFromPayload,
  normalizeSalePaymentMethod,
  normalizeStatus,
  normalizeString,
  StockError,
  sumPaymentAmounts,
  sumPaymentFees,
} from "../utils/sale.normalizer";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type ParsedSaleItem = {
  catalogItemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

function serviceError(error: string, status: number, details?: string) {
  return {
    error,
    status,
    ...(details ? { details } : {}),
  } as const;
}

function buildSaleWhere(search: string, status: ReturnType<typeof normalizeStatus>, from: Date | null, to: Date | null) {
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

  return where;
}

function buildCompletedServiceOrderWhere(search: string, from: Date | null, to: Date | null) {
  const where: Prisma.ServiceOrderWhereInput = {
    status: "FINALIZADA",
  };

  if (from || to) {
    where.updatedAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (search) {
    const code = Number(search);

    where.OR = [
      { responsible: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      { vehicle: { plate: { contains: search, mode: "insensitive" } } },
      { vehicle: { model: { contains: search, mode: "insensitive" } } },
      { mechanic: { name: { contains: search, mode: "insensitive" } } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  return where;
}

function normalizeListStatus(value: string | null) {
  const normalized = normalizeString(value);

  if (normalized === "TODOS") {
    return null;
  }

  return normalizeStatus(normalized) ?? "CONCLUIDA";
}

function parseSaleItems(rawItems: unknown[]) {
  const items: ParsedSaleItem[] = [];

  for (const rawItem of rawItems) {
    const item = rawItem as Record<string, unknown>;
    const description = normalizeString(item.description);
    const quantity = normalizeNumber(item.quantity);
    const unitPrice = normalizeMoney(item.unitPrice);
    const discountPercent = normalizeMoney(item.discountPercent) ?? 0;
    const catalogItemId = normalizeString(item.catalogItemId);

    if (!description) {
      return serviceError("Descrição do item é obrigatória.", 400);
    }

    if (!catalogItemId) {
      return serviceError("Selecione um produto ou serviço cadastrado para vender.", 400);
    }

    if (quantity === null || quantity <= 0) {
      return serviceError("Quantidade deve ser maior que zero.", 400);
    }

    if (unitPrice === null) {
      return serviceError("Valor unitário inválido.", 400);
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return serviceError("Desconto deve estar entre 0 e 100%.", 400);
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

  return {
    data: items,
  };
}

function normalizeServiceOrderPaymentDiscount(
  value: unknown,
  serviceOrderTotal: Prisma.Decimal,
) {
  if (value === undefined || value === null || value === "") {
    return {
      data: new Prisma.Decimal(0),
    };
  }

  const discountAmount = normalizeMoney(value);

  if (discountAmount === null) {
    return serviceError("Desconto inválido.", 400);
  }

  const discount = new Prisma.Decimal(discountAmount);

  if (discount.greaterThanOrEqualTo(serviceOrderTotal)) {
    return serviceError("Desconto deve ser menor que o total da OS.", 400);
  }

  return {
    data: discount,
  };
}

function buildServiceOrderSaleItems(params: {
  items: Array<{
    id: string;
    catalogItemId: string | null;
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    catalogItem: {
      name: string;
    } | null;
  }>;
  additionalDiscount: Prisma.Decimal;
}) {
  const { items, additionalDiscount } = params;
  const positiveItemTotals = items
    .map((item) => new Prisma.Decimal(item.total))
    .filter((item) => item.greaterThan(0));
  const positiveTotal = positiveItemTotals.reduce(
    (sum, item) => sum.plus(item),
    new Prisma.Decimal(0),
  );
  let remainingDiscount = additionalDiscount.toDecimalPlaces(2);
  let positiveIndexPosition = 0;

  return items.map((item) => {
    const quantity = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    const lineSubtotal = quantity.mul(unitPrice);
    const originalDiscount = new Prisma.Decimal(item.discount);
    const originalTotal = new Prisma.Decimal(item.total);
    let paymentDiscount = new Prisma.Decimal(0);

    if (
      remainingDiscount.greaterThan(0) &&
      originalTotal.greaterThan(0) &&
      positiveTotal.greaterThan(0)
    ) {
      const isLastPositiveItem =
        positiveIndexPosition === positiveItemTotals.length - 1;

      paymentDiscount = isLastPositiveItem
        ? remainingDiscount
        : additionalDiscount
            .mul(originalTotal)
            .div(positiveTotal)
            .toDecimalPlaces(2);

      if (paymentDiscount.greaterThan(originalTotal)) {
        paymentDiscount = originalTotal;
      }

      if (paymentDiscount.greaterThan(remainingDiscount)) {
        paymentDiscount = remainingDiscount;
      }

      remainingDiscount = remainingDiscount.minus(paymentDiscount);
      positiveIndexPosition += 1;
    }

    const discount = originalDiscount.plus(paymentDiscount).toDecimalPlaces(2);

    return {
      serviceOrderItemId: item.id,
      catalogItemId: item.catalogItemId,
      description: item.catalogItem?.name ?? item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      total: lineSubtotal.minus(discount).toDecimalPlaces(2),
    };
  });
}

async function createMechanicCommissionPayable(params: {
  tx: Prisma.TransactionClient;
  serviceOrder: {
    id: string;
    code: number;
    mechanic: {
      id: string;
      name: string;
      commissionPercent: Prisma.Decimal;
    } | null;
    items: Array<{
      type: "SERVICE" | "PRODUCT";
      quantity: number;
      unitPrice: Prisma.Decimal;
      discount: Prisma.Decimal;
      total: Prisma.Decimal;
      commissionBase: Prisma.Decimal | null;
      mechanic: {
        id: string;
        name: string;
        commissionPercent: Prisma.Decimal;
      } | null;
      catalogItem: {
        type: "PRODUTO" | "SERVICO";
      } | null;
    }>;
  };
}) {
  const { tx, serviceOrder } = params;
  const commissionByMechanic = new Map<
    string,
    {
      mechanic: {
        id: string;
        name: string;
        commissionPercent: Prisma.Decimal;
      };
      base: Prisma.Decimal;
    }
  >();

  for (const item of serviceOrder.items) {
    const mechanic = item.mechanic ?? serviceOrder.mechanic;

    if (!mechanic) {
      continue;
    }

    const isService = item.type === "SERVICE" || item.catalogItem?.type === "SERVICO";
    const base =
      item.commissionBase !== null && item.commissionBase !== undefined
        ? new Prisma.Decimal(item.commissionBase)
        : isService
          ? new Prisma.Decimal(item.total)
          : new Prisma.Decimal(0);

    if (base.lessThanOrEqualTo(0)) {
      continue;
    }

    const current = commissionByMechanic.get(mechanic.id);

    commissionByMechanic.set(mechanic.id, {
      mechanic,
      base: current ? current.base.plus(base) : base,
    });
  }

  const createdAccounts = [];

  for (const { mechanic, base } of commissionByMechanic.values()) {
    const commissionPercent = new Prisma.Decimal(mechanic.commissionPercent ?? 0);

    if (commissionPercent.lessThanOrEqualTo(0) || base.lessThanOrEqualTo(0)) {
      continue;
    }

    const commissionAmount = base.mul(commissionPercent).div(100).toDecimalPlaces(2);

    if (commissionAmount.lessThanOrEqualTo(0)) {
      continue;
    }

    const existingCommission = await tx.financialAccount.findFirst({
      where: {
        type: "PAGAR",
        documentNumber: `OS-${serviceOrder.code}`,
        category: "Comissão mecânico",
        counterparty: mechanic.name,
        status: {
          not: "CANCELADA",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCommission) {
      continue;
    }

    const account = await tx.financialAccount.create({
      data: {
        type: "PAGAR",
        status: "ABERTA",
        description: `Comissão do mecânico - OS #${serviceOrder.code}`,
        counterparty: mechanic.name,
        category: "Comissão mecânico",
        documentNumber: `OS-${serviceOrder.code}`,
        dueDate: getNextWeeklyPaymentDate(),
        amount: commissionAmount,
        paidAmount: null,
        paymentMethod: null,
        notes: `Comissão de ${commissionPercent.toFixed(
          2,
        )}% sobre base comissionável da OS #${serviceOrder.code}. Base: ${base.toFixed(
          2,
        )}.`,
      },
    });

    createdAccounts.push(account);
  }

  return createdAccounts;
}
function extractServiceOrderCodeFromSale(sale: {
  notes: string | null;
  cashMovements: Array<{ documentNumber: string | null }>;
}) {
  const candidates = [
    sale.notes && /ordem de serviço/i.test(sale.notes) ? sale.notes : null,
    ...sale.cashMovements
      .map((movement) => movement.documentNumber)
      .filter((documentNumber: string | null): documentNumber is string =>
        typeof documentNumber === "string" &&
        /^OS(?:\s*#|\s*-)?\s*\d+$/i.test(documentNumber)
      ),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const match = candidate.match(/OS(?:\s*#|\s*-)?\s*(\d+)/i);

    if (match?.[1]) {
      const code = Number(match[1]);
      if (Number.isInteger(code) && code > 0) {
        return code;
      }
    }
  }

  return null;
}

async function reverseSaleStockMovements(params: {
  tx: Prisma.TransactionClient;
  sale: {
    id: string;
    code: number;
    stockMovements: Array<{
      type: "SAIDA" | "ENTRADA" | "ESTORNO" | "AJUSTE";
      catalogItemId: string;
      saleItemId: string | null;
      serviceOrderId: string | null;
      serviceOrderItemId: string | null;
      quantity: Prisma.Decimal;
    }>;
  };
}) {
  const { tx, sale } = params;

  for (const movement of sale.stockMovements) {
    if (movement.type !== "SAIDA") {
      continue;
    }

    const catalogItem = await tx.catalogItem.findUnique({
      where: { id: movement.catalogItemId },
      select: { stockCurrent: true },
    });

    if (!catalogItem?.stockCurrent) {
      continue;
    }

    const stockBefore = new Prisma.Decimal(catalogItem.stockCurrent);

    await tx.catalogItem.update({
      where: { id: movement.catalogItemId },
      data: {
        stockCurrent: {
          increment: movement.quantity,
        },
      },
    });

    const updatedItem = await tx.catalogItem.findUnique({
      where: { id: movement.catalogItemId },
      select: { stockCurrent: true },
    });

    await tx.stockMovement.create({
      data: {
        type: "ESTORNO",
        catalogItemId: movement.catalogItemId,
        saleId: sale.id,
        saleItemId: movement.saleItemId,
        serviceOrderId: movement.serviceOrderId,
        serviceOrderItemId: movement.serviceOrderItemId,
        quantity: movement.quantity,
        stockBefore,
        stockAfter: updatedItem?.stockCurrent ?? null,
        reason: `Cancelamento da venda PDV #${sale.code}`,
        notes: "Estorno automÃ¡tico por cancelamento no PDV.",
      },
    });
  }
}

async function findServiceOrderForSaleCancellation(params: {
  tx: Prisma.TransactionClient;
  sale: {
    serviceOrderId: string | null;
    notes: string | null;
    cashMovements: Array<{ documentNumber: string | null }>;
  };
}) {
  const { tx, sale } = params;

  if (sale.serviceOrderId) {
    return tx.serviceOrder.findUnique({
      where: { id: sale.serviceOrderId },
      include: {
        mechanic: { select: { name: true } },
        financialAccount: { select: { id: true } },
      },
    });
  }

  const serviceOrderCode = extractServiceOrderCodeFromSale(sale);

  if (!serviceOrderCode) {
    return null;
  }

  return tx.serviceOrder.findUnique({
    where: { code: serviceOrderCode },
    include: {
      mechanic: { select: { name: true } },
      financialAccount: { select: { id: true } },
    },
  });
}

async function cancelServiceOrderPaymentArtifacts(params: {
  tx: Prisma.TransactionClient;
  serviceOrder: {
    id: string;
    code: number;
    mechanic: { name: string } | null;
    financialAccount: { id: string } | null;
  };
}) {
  const { tx, serviceOrder } = params;

  if (serviceOrder.financialAccount) {
    await tx.cashMovement.deleteMany({
      where: {
        financialAccountId: serviceOrder.financialAccount.id,
      },
    });
  }

  const commissionAccounts = await tx.financialAccount.findMany({
    where: {
      type: "PAGAR",
      documentNumber: `OS-${serviceOrder.code}`,
      category: "Comissão mecânico",
    },
    select: { id: true },
  });

  for (const account of commissionAccounts) {
    await tx.cashMovement.deleteMany({
      where: {
        financialAccountId: account.id,
      },
    });

    await tx.financialAccount.delete({
      where: { id: account.id },
    });
  }
}

export const saleService = {
  async list(request: NextRequest) {
    try {
      console.log("[PDV_GET] INIT");

      const { searchParams } = new URL(request.url);
      const page = coerceNumber(searchParams.get("page"), 1);
      const pageSize = Math.min(
        coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
        MAX_PAGE_SIZE,
      );
      const search = normalizeString(searchParams.get("search")) ?? "";
      const status = normalizeListStatus(searchParams.get("status"));
      const from = normalizeDateStart(searchParams.get("from"));
      const to = normalizeDateEnd(searchParams.get("to"));

      console.log("[PDV_GET] FILTERS:", {
        page,
        pageSize,
        search,
        status,
        from,
        to,
      });

      const where = buildSaleWhere(search, status, from, to);

      console.log("[PDV_GET] BEFORE SALE COUNT");
      console.log("[PDV_GET] BEFORE SALE FIND MANY");

      const { total, items } = await saleRepository.findPaginated({
        where,
        page,
        pageSize,
      });
      const serviceOrderWhere =
        status === "CANCELADA" ? null : buildCompletedServiceOrderWhere(search, from, to);

      console.log("[PDV_GET] SERVICE ORDER WHERE:", serviceOrderWhere);
      console.log("[PDV_GET] BEFORE SERVICE ORDER FIND MANY");

      const [serviceOrdersCompleted, serviceOrdersCompletedSummary] = serviceOrderWhere
        ? await Promise.all([
            saleRepository.findCompletedServiceOrders(serviceOrderWhere),
            saleRepository.summarizeCompletedServiceOrders(serviceOrderWhere),
          ])
        : [
            [],
            {
              _count: { _all: 0 },
              _sum: { total: 0 },
            },
          ];

      console.log("[PDV_GET] SUCCESS:", {
        total,
        sales: items.length,
        serviceOrdersCompleted: serviceOrdersCompletedSummary._count._all,
      });

      return {
        data: {
          items,
          total,
          page,
          pageSize,
          serviceOrdersCompleted,
          serviceOrdersCompletedSummary: {
            count: serviceOrdersCompletedSummary._count._all,
            total: serviceOrdersCompletedSummary._sum.total,
          },
        },
      };
    } catch (error) {
      console.error("[PDV_GET] ERROR:", error);

      return serviceError(
        "Erro ao buscar dados do PDV.",
        500,
        error instanceof Error ? error.message : String(error),
      );
    }
  },

  async create(payload: Record<string, unknown>, responsibleFallback: string) {
    const clientId = normalizeString(payload.clientId);
    const sectorId = normalizeString(payload.sectorId);
    const responsible = normalizeString(payload.responsible) ?? responsibleFallback;
    const paymentMethod = normalizeSalePaymentMethod(payload.paymentMethod);
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (!paymentMethod) {
      return serviceError("Forma de pagamento invalida.", 400);
    }

    if (clientId) {
      const client = await saleRepository.findClientById(clientId);

      if (!client) {
        return serviceError("Cliente nÃ£o encontrado.", 404);
      }
    }

    const sector = sectorId ? await saleRepository.findSectorById(sectorId) : null;

    if (sectorId && !sector) {
      return serviceError("Setor nÃ£o encontrado.", 404);
    }

    if (sector && !sector.active) {
      return serviceError("Setor esta inativo.", 400);
    }

    if (rawItems.length === 0) {
      return serviceError("Inclua pelo menos um item na venda.", 400);
    }

    const parsedItems = parseSaleItems(rawItems);

    if ("error" in parsedItems) {
      return parsedItems;
    }

    const items = parsedItems.data;
    const uniqueCatalogItemIds = Array.from(new Set(items.map((item) => item.catalogItemId)));
    const foundItems = await saleRepository.findCatalogItemsByIds(uniqueCatalogItemIds);

    if (foundItems.length !== uniqueCatalogItemIds.length) {
      return serviceError("Produto da venda nÃ£o encontrado.", 404);
    }

    const catalogItemsById = new Map(foundItems.map((item) => [item.id, item]));
    const requestedStockByItem = new Map<string, Prisma.Decimal>();

    items.forEach((item) => {
      const catalogItem = catalogItemsById.get(item.catalogItemId);

      if (!catalogItem || catalogItem.type !== "PRODUTO") {
        return;
      }

      const currentRequested = requestedStockByItem.get(catalogItem.id) ?? new Prisma.Decimal(0);
      requestedStockByItem.set(
        catalogItem.id,
        currentRequested.add(new Prisma.Decimal(item.quantity)),
      );
    });

    for (const [catalogItemId, requestedQuantity] of requestedStockByItem) {
      const catalogItem = catalogItemsById.get(catalogItemId);
      const currentStock = new Prisma.Decimal(catalogItem?.stockCurrent ?? 0);

      if (currentStock.lessThan(requestedQuantity)) {
        return serviceError(
          `Estoque insuficiente para ${catalogItem?.name ?? "produto"}. Disponível: ${formatStock(currentStock)}. Solicitado: ${formatStock(requestedQuantity)}.`,
          400,
        );
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.total + item.discount, 0);
    const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const baseTotal = new Prisma.Decimal(Math.round(total * 100) / 100);
    const payments = normalizePaymentsFromPayload(payload, baseTotal);

    if (!payments?.length) {
      return serviceError("Nenhuma forma de pagamento válida foi informada.", 400);
    }

    const totalPaid = sumPaymentAmounts(payments);
    const feeTotal = sumPaymentFees(payments);
    const expectedTotal = baseTotal.plus(feeTotal);

    if (!totalPaid.equals(expectedTotal)) {
      return serviceError(
        "Total pago inválido.",
        400,
        `Total esperado: ${expectedTotal.toFixed(2)}. Total recebido: ${totalPaid.toFixed(2)}.`,
      );
    }

    try {
      const sale = await saleRepository.runTransaction(async (tx) => {
        const createdSale = await tx.sale.create({
          data: {
            clientId,
            sectorId,
            responsible,
            sectorName: sector?.name ?? null,
            paymentMethod: payments[0].paymentMethod,
            notes: normalizeString(payload.notes),
            subtotal: Math.round(subtotal * 100) / 100,
            discountTotal: Math.round(discountTotal * 100) / 100,
            feeTotal,
            total: totalPaid,
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
            payments: {
              create: payments.map((payment) => ({
                paymentMethod: payment.paymentMethod,
                amount: payment.amount,
                feeAmount: payment.feeAmount,
                netAmount: payment.amount.minus(payment.feeAmount),
                installments: payment.installments,
              })),
            },
          },
          include: saleListInclude,
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
              `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(currentStock)}. Solicitado: ${formatStock(quantity)}.`,
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
              `Estoque insuficiente para ${catalogItem.name}. Atualize a venda e tente novamente.`,
            );
          }

          const updatedItem = await tx.catalogItem.findUnique({
            where: { id: catalogItem.id },
            select: { stockCurrent: true },
          });

          await tx.stockMovement.create({
            data: {
              type: "SAIDA",
              catalogItemId: catalogItem.id,
              saleId: createdSale.id,
              saleItemId: item.id,
              quantity,
              stockBefore: currentStock,
              stockAfter: updatedItem?.stockCurrent ?? null,
              reason: `Venda #${createdSale.code}`,
            },
          });
        }

        const category = await ensurePdvCategory(tx);

        await createPaymentCashMovements({
          tx,
          saleId: createdSale.id,
          code: createdSale.code,
          payments,
          categoryId: category.id,
          description: `Venda PDV #${createdSale.code}`,
          documentNumber: `PDV-${createdSale.code}`,
          notes: createdSale.client?.name
            ? `Cliente: ${createdSale.client.name}`
            : "Caixa livre",
        });

        return createdSale;
      });

      return {
        data: sale,
      };
    } catch (error) {
      if (error instanceof StockError) {
        return serviceError(error.message, 400);
      }

      throw error;
    }
  },

  async findServiceOrderForPdv(id: string) {
    const serviceOrder = await saleRepository.findServiceOrderById(id);

    if (!serviceOrder) {
      return serviceError("Ordem de serviço não encontrada.", 404);
    }

    return {
      data: {
        id: serviceOrder.id,
        code: serviceOrder.code,
        status: serviceOrder.status,
        client: serviceOrder.client,
        vehicle: serviceOrder.vehicle,
        mechanic: serviceOrder.mechanic,
        items: serviceOrder.items.map((item) => ({
          id: item.id,
          catalogItemId: item.catalogItemId,
          code: item.catalogItem?.code ?? null,
          name: item.catalogItem?.name ?? item.description ?? "Item sem nome",
          type: item.catalogItem?.type ?? "SERVICO",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Number(item.quantity) * Number(item.unitPrice),
          stockCurrent: item.catalogItem?.stockCurrent ?? null,
        })),
        subtotal: serviceOrder.subtotal,
        discount: serviceOrder.discountTotal,
        total: serviceOrder.total,
      },
    };
  },

  async updateStatus(id: string, payload: Record<string, unknown>) {
    const status = normalizeStatus(normalizeString(payload.status));

    if (!status) {
      return serviceError("Status da venda invÃ¡lido.", 400);
    }

    if (status !== "CANCELADA") {
      return serviceError("Use o fluxo de pagamento para concluir a venda.", 400);
    }

    try {
      const result = await saleRepository.runTransaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id },
          include: {
            cashMovements: {
              select: {
                documentNumber: true,
              },
            },
            stockMovements: {
              select: {
                type: true,
                catalogItemId: true,
                saleItemId: true,
                serviceOrderId: true,
                serviceOrderItemId: true,
                quantity: true,
              },
            },
            serviceOrder: {
              include: {
                mechanic: { select: { name: true } },
                financialAccount: { select: { id: true } },
              },
            },
          },
        });

        if (!sale) {
          throw new Error("SALE_NOT_FOUND");
        }

        if (sale.status === "CANCELADA") {
          return tx.sale.findUniqueOrThrow({
            where: { id },
            include: saleListInclude,
          });
        }

        const cancelGuard = await tx.sale.updateMany({
          where: {
            id,
            status: {
              not: "CANCELADA",
            },
          },
          data: {
            status,
            notes: sale.notes
              ? `${sale.notes} | Pagamento cancelado no PDV.`
              : "Pagamento cancelado no PDV.",
          },
        });

        if (cancelGuard.count !== 1) {
          return tx.sale.findUniqueOrThrow({
            where: { id },
            include: saleListInclude,
          });
        }

        const serviceOrder =
          sale.serviceOrder ??
          (await findServiceOrderForSaleCancellation({
            tx,
            sale,
          }));
        const updatedSale = await tx.sale.findUniqueOrThrow({
          where: { id },
          include: saleListInclude,
        });

        await reverseSaleStockMovements({
          tx,
          sale,
        });

        await tx.cashMovement.deleteMany({
          where: {
            saleId: sale.id,
          },
        });

        await tx.salePayment.deleteMany({
          where: {
            saleId: sale.id,
          },
        });

        if (serviceOrder) {
          await cancelServiceOrderPaymentArtifacts({
            tx,
            serviceOrder,
          });
        }

        return updatedSale;
      });

      return { data: result };
    } catch (error) {
      if (error instanceof Error && error.message === "SALE_NOT_FOUND") {
        return serviceError("Venda nÃ£o encontrada.", 404);
      }

      return serviceError(
        "Erro ao cancelar venda.",
        500,
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    }
  },

  async finalizePayment(id: string, payload: Record<string, unknown>) {
    const serviceOrderId = normalizeString(payload.serviceOrderId);

    if (serviceOrderId) {
      return this.finalizeServiceOrderPayment(serviceOrderId, payload);
    }

    return this.finalizeSalePayment(id, payload);
  },

  async finalizeServiceOrderPayment(serviceOrderId: string, payload: Record<string, unknown>) {
    const serviceOrder = await saleRepository.findServiceOrderById(serviceOrderId);

    if (!serviceOrder) {
      return serviceError("Ordem de serviço não encontrada.", 404);
    }

    if (serviceOrder.status === "PAGA") {
      return serviceError("Esta ordem de serviço já foi paga.", 400);
    }

    const serviceOrderTotal = new Prisma.Decimal(serviceOrder.total);
    const paymentDiscountResult = normalizeServiceOrderPaymentDiscount(
      payload.discountAmount,
      serviceOrderTotal,
    );

    if ("error" in paymentDiscountResult) {
      return paymentDiscountResult;
    }

    const paymentDiscount = paymentDiscountResult.data;
    const paymentBaseTotal = serviceOrderTotal.minus(paymentDiscount).toDecimalPlaces(2);
    const payments = normalizePaymentsFromPayload(payload, paymentBaseTotal);

    if (!payments?.length) {
      return serviceError("Nenhuma forma de pagamento válida foi informada.", 400);
    }

    const totalPaid = sumPaymentAmounts(payments);
    const feeTotal = sumPaymentFees(payments);
    const expectedTotal = paymentBaseTotal.plus(feeTotal);

    if (!totalPaid.equals(expectedTotal)) {
      return serviceError(
        "Total pago inválido.",
        400,
        `Total esperado: ${expectedTotal.toFixed(2)}. Total recebido: ${totalPaid.toFixed(2)}.`,
      );
    }

    try {
      const result = await saleRepository.runTransaction(async (tx) => {
        const paymentGuard = await tx.serviceOrder.updateMany({
          where: {
            id: serviceOrder.id,
            status: "FINALIZADA",
          },
          data: {
            status: "PAGA",
          },
        });

        if (paymentGuard.count !== 1) {
          const existingSale = await tx.sale.findFirst({
            where: {
              serviceOrderId: serviceOrder.id,
              status: "CONCLUIDA",
            },
            orderBy: {
              createdAt: "desc",
            },
            include: salePaymentInclude,
          });

          if (existingSale) {
            const currentServiceOrder = await tx.serviceOrder.findUniqueOrThrow({
              where: {
                id: serviceOrder.id,
              },
            });

            return {
              sale: existingSale,
              serviceOrder: currentServiceOrder,
              mechanicCommissionPayable: null,
              updatedFinancialAccountsCount: 0,
            };
          }

          throw new Error("SERVICE_ORDER_ALREADY_PAID");
        }

        const saleItems = buildServiceOrderSaleItems({
          items: serviceOrder.items,
          additionalDiscount: paymentDiscount,
        });
        const discountTotal = new Prisma.Decimal(serviceOrder.discountTotal)
          .plus(paymentDiscount)
          .toDecimalPlaces(2);
        const paymentDiscountNote = paymentDiscount.greaterThan(0)
          ? ` Desconto no pagamento: R$ ${paymentDiscount.toFixed(2)}.`
          : "";
        const sale = await tx.sale.create({
          data: {
            clientId: serviceOrder.clientId,
            serviceOrderId: serviceOrder.id,
            status: "CONCLUIDA",
            paymentMethod: payments[0].paymentMethod,
            subtotal: serviceOrder.subtotal,
            discountTotal,
            feeTotal,
            total: totalPaid,
            responsible: serviceOrder.responsible ?? "PDV",
            notes: `Pagamento da ordem de serviço #${serviceOrder.code}.${paymentDiscountNote}`,
            items: {
              create: saleItems.map((item) => ({
                catalogItemId: item.catalogItemId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total: item.total,
              })),
            },
            payments: {
              create: payments.map((payment) => ({
                paymentMethod: payment.paymentMethod,
                amount: payment.amount,
                feeAmount: payment.feeAmount,
                netAmount: payment.amount.minus(payment.feeAmount),
                installments: payment.installments,
              })),
            },
          },
          include: salePaymentInclude,
        });
        const saleItemsByServiceOrderItemId = new Map(
          saleItems.map((saleItem, index) => [
            saleItem.serviceOrderItemId,
            sale.items[index],
          ]),
        );

        for (const item of serviceOrder.items) {
          if (!item.catalogItemId || item.catalogItem?.type !== "PRODUTO") {
            continue;
          }

          const catalogItem = await tx.catalogItem.findUnique({
            where: {
              id: item.catalogItemId,
            },
            select: {
              id: true,
              name: true,
              stockCurrent: true,
            },
          });

          if (!catalogItem) {
            continue;
          }

          const quantity = new Prisma.Decimal(item.quantity);
          const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);

          if (currentStock.lessThan(quantity)) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(
                currentStock,
              )}. Solicitado: ${formatStock(quantity)}.`,
            );
          }

          const updateResult = await tx.catalogItem.updateMany({
            where: {
              id: catalogItem.id,
              stockCurrent: {
                not: null,
                gte: quantity,
              },
            },
            data: {
              stockCurrent: {
                decrement: quantity,
              },
            },
          });

          if (updateResult.count !== 1) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Atualize a ordem de serviço e tente novamente.`,
            );
          }

          const updatedItem = await tx.catalogItem.findUnique({
            where: {
              id: catalogItem.id,
            },
            select: {
              stockCurrent: true,
            },
          });

          await tx.stockMovement.create({
            data: {
              type: "SAIDA",
              catalogItemId: catalogItem.id,
              saleId: sale.id,
              saleItemId: saleItemsByServiceOrderItemId.get(item.id)?.id,
              serviceOrderId: serviceOrder.id,
              serviceOrderItemId: item.id,
              quantity,
              stockBefore: currentStock,
              stockAfter: updatedItem?.stockCurrent ?? null,
              reason: `Pagamento da OS #${serviceOrder.code}`,
            },
          });
        }
        const category = await ensureServiceOrderCategory(tx);

        await createPaymentCashMovements({
          tx,
          saleId: sale.id,
          code: sale.code,
          payments,
          categoryId: category.id,
          description: `Pagamento da ordem de serviço #${serviceOrder.code}`,
          documentNumber: `OS-${serviceOrder.code}`,
          notes: "Pagamento realizado via PDV",
        });

        const updatedFinancialAccounts = await tx.financialAccount.updateMany({
          where: {
            type: "RECEBER",
            status: {
              in: ["ABERTA", "VENCIDA"],
            },
            OR: [
              {
                serviceOrderId: serviceOrder.id,
              },
              {
                documentNumber: `OS-${serviceOrder.code}`,
              },
              {
                documentNumber: `OS #${serviceOrder.code}`,
              },
              {
                description: `OS #${serviceOrder.code}`,
              },
            ],
          },
          data: {
            status: "PAGA",
            paymentDate: new Date(),
            paidAmount: paymentBaseTotal,
            paymentMethod: payments[0].paymentMethod,
            notes: `Conta baixada automaticamente pelo pagamento da OS #${serviceOrder.code} via PDV.${paymentDiscountNote}`,
          },
        });

        console.log("[PDV_OS_PAYMENT] Contas financeiras baixadas:", {
          serviceOrderId: serviceOrder.id,
          serviceOrderCode: serviceOrder.code,
          count: updatedFinancialAccounts.count,
        });

        const mechanicCommissionPayable = await createMechanicCommissionPayable({
          tx,
          serviceOrder,
        });

        const updatedServiceOrder = await tx.serviceOrder.findUniqueOrThrow({
          where: {
            id: serviceOrder.id,
          },
        });

        return {
          sale,
          serviceOrder: updatedServiceOrder,
          mechanicCommissionPayable,
          updatedFinancialAccountsCount: updatedFinancialAccounts.count,
        };
      });

      return {
        data: result,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "SERVICE_ORDER_ALREADY_PAID") {
        return serviceError("Esta ordem de serviço já foi paga.", 400);
      }

      return serviceError(
        "Erro ao finalizar pagamento da ordem de serviço.",
        500,
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    }
  },

  async finalizeSalePayment(id: string, payload: Record<string, unknown>) {
    const currentSale = await saleRepository.findSaleForStock(id);

    if (!currentSale) {
      return serviceError("Venda nÃ£o encontrada.", 404);
    }

    const payments = normalizePaymentsFromPayload(payload, currentSale.total);

    if (!payments?.length) {
      return serviceError("Nenhuma forma de pagamento válida foi informada.", 400);
    }

    const totalPaid = sumPaymentAmounts(payments);
    const feeTotal = sumPaymentFees(payments);
    const expectedTotal = new Prisma.Decimal(currentSale.total).plus(feeTotal);

    if (!totalPaid.equals(expectedTotal)) {
      return serviceError(
        "Total pago inválido.",
        400,
        `Total esperado: ${expectedTotal.toFixed(2)}. Total recebido: ${totalPaid.toFixed(2)}.`,
      );
    }

    try {
      const sale = await saleRepository.runTransaction(async (tx) => {
        for (const item of currentSale.items) {
          if (!item.catalogItemId || item.catalogItem?.type !== "PRODUTO") {
            continue;
          }

          const catalogItem = await tx.catalogItem.findUnique({
            where: {
              id: item.catalogItemId,
            },
            select: {
              id: true,
              name: true,
              stockCurrent: true,
            },
          });

          if (!catalogItem) {
            continue;
          }

          const quantity = new Prisma.Decimal(item.quantity);
          const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);

          if (currentStock.lessThan(quantity)) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(
                currentStock,
              )}. Solicitado: ${formatStock(quantity)}.`,
            );
          }

          const updateResult = await tx.catalogItem.updateMany({
            where: {
              id: catalogItem.id,
              stockCurrent: {
                not: null,
                gte: quantity,
              },
            },
            data: {
              stockCurrent: {
                decrement: quantity,
              },
            },
          });

          if (updateResult.count !== 1) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Atualize a venda e tente novamente.`,
            );
          }

          const updatedItem = await tx.catalogItem.findUnique({
            where: {
              id: catalogItem.id,
            },
            select: {
              stockCurrent: true,
            },
          });

          await tx.stockMovement.create({
            data: {
              type: "SAIDA",
              catalogItemId: catalogItem.id,
              saleId: currentSale.id,
              saleItemId: item.id,
              quantity,
              stockBefore: currentStock,
              stockAfter: updatedItem?.stockCurrent ?? null,
              reason: `Venda PDV #${currentSale.code}`,
            },
          });
        }

        await tx.salePayment.deleteMany({
          where: {
            saleId: currentSale.id,
          },
        });

        const updatedSale = await tx.sale.update({
          where: {
            id,
          },
          data: {
            status: "CONCLUIDA",
            paymentMethod: payments[0].paymentMethod,
            feeTotal,
            total: totalPaid,
            payments: {
              create: payments.map((payment) => ({
                paymentMethod: payment.paymentMethod,
                amount: payment.amount,
                feeAmount: payment.feeAmount,
                netAmount: payment.amount.minus(payment.feeAmount),
                installments: payment.installments,
              })),
            },
          },
          include: salePaymentInclude,
        });

        const category = await ensurePdvCategory(tx);

        await createPaymentCashMovements({
          tx,
          saleId: updatedSale.id,
          code: updatedSale.code,
          payments,
          categoryId: category.id,
          description: `Venda PDV #${updatedSale.code}`,
          documentNumber: `PDV-${updatedSale.code}`,
          notes: "Pagamento realizado via PDV",
        });

        return updatedSale;
      });

      return {
        data: sale,
      };
    } catch (error) {
      return serviceError(
        "Erro ao finalizar venda.",
        500,
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    }
  },
};


