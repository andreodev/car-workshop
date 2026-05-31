import type { NextRequest } from "next/server";
import { Prisma, type SalePaymentMethod } from "@prisma/client";

import {
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

function buildCompletedServiceOrderWhere(search: string) {
  const where: Prisma.ServiceOrderWhereInput = {
    status: "FINALIZADA",
  };

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

async function createSaleCashEntry(
  tx: Prisma.TransactionClient,
  sale: {
    id: string;
    code: number;
    total: Prisma.Decimal;
    paymentMethod: SalePaymentMethod;
    client?: { name: string } | null;
  },
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
      catalogItem: {
        type: "PRODUTO" | "SERVICO";
      } | null;
    }>;
  };
}) {
  const { tx, serviceOrder } = params;

  if (!serviceOrder.mechanic) {
    return null;
  }

  const commissionPercent = new Prisma.Decimal(
    serviceOrder.mechanic.commissionPercent ?? 0,
  );

  if (commissionPercent.lessThanOrEqualTo(0)) {
    return null;
  }

  const serviceItemsTotal = serviceOrder.items.reduce((acc, item) => {
    const isService = item.type === "SERVICE" || item.catalogItem?.type === "SERVICO";

    if (!isService) {
      return acc;
    }

    return acc.plus(new Prisma.Decimal(item.total));
  }, new Prisma.Decimal(0));

  if (serviceItemsTotal.lessThanOrEqualTo(0)) {
    return null;
  }

  const commissionAmount = serviceItemsTotal
    .mul(commissionPercent)
    .div(100)
    .toDecimalPlaces(2);

  if (commissionAmount.lessThanOrEqualTo(0)) {
    return null;
  }

  const existingCommission = await tx.financialAccount.findFirst({
    where: {
      type: "PAGAR",
      documentNumber: `OS-${serviceOrder.code}`,
      category: "Comissão mecânico",
      counterparty: serviceOrder.mechanic.name,
      status: {
        not: "CANCELADA",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCommission) {
    return null;
  }

  return tx.financialAccount.create({
    data: {
      type: "PAGAR",
      status: "ABERTA",
      description: `Comissão do mecânico - OS #${serviceOrder.code}`,
      counterparty: serviceOrder.mechanic.name,
      category: "Comissão mecânico",
      documentNumber: `OS-${serviceOrder.code}`,
      dueDate: getNextWeeklyPaymentDate(),
      amount: commissionAmount,
      paidAmount: null,
      paymentMethod: null,
      notes: `Comissão de ${commissionPercent.toFixed(
        2,
      )}% sobre serviços da OS #${serviceOrder.code}. Base: ${serviceItemsTotal.toFixed(
        2,
      )}.`,
    },
  });
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
      const status = normalizeStatus(searchParams.get("status"));
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
      const serviceOrderWhere = buildCompletedServiceOrderWhere(search);

      console.log("[PDV_GET] SERVICE ORDER WHERE:", serviceOrderWhere);
      console.log("[PDV_GET] BEFORE SERVICE ORDER FIND MANY");

      const serviceOrdersCompleted =
        await saleRepository.findCompletedServiceOrders(serviceOrderWhere);

      console.log("[PDV_GET] SUCCESS:", {
        total,
        sales: items.length,
        serviceOrdersCompleted: serviceOrdersCompleted.length,
      });

      return {
        data: {
          items,
          total,
          page,
          pageSize,
          serviceOrdersCompleted,
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
        return serviceError("Cliente não encontrado.", 404);
      }
    }

    const sector = sectorId ? await saleRepository.findSectorById(sectorId) : null;

    if (sectorId && !sector) {
      return serviceError("Setor não encontrado.", 404);
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
      return serviceError("Produto da venda não encontrado.", 404);
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

    try {
      const sale = await saleRepository.runTransaction(async (tx) => {
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

        await createSaleCashEntry(tx, createdSale);

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

    const payments = normalizePaymentsFromPayload(payload, serviceOrder.total);

    if (!payments?.length) {
      return serviceError("Nenhuma forma de pagamento válida foi informada.", 400);
    }

    const totalPaid = sumPaymentAmounts(payments);
    const feeTotal = sumPaymentFees(payments);
    const expectedTotal = new Prisma.Decimal(serviceOrder.total).plus(feeTotal);

    if (!totalPaid.equals(expectedTotal)) {
      return serviceError(
        "Total pago inválido.",
        400,
        `Total esperado: ${expectedTotal.toFixed(2)}. Total recebido: ${totalPaid.toFixed(2)}.`,
      );
    }

    try {
      const result = await saleRepository.runTransaction(async (tx) => {
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
              serviceOrderId: serviceOrder.id,
              serviceOrderItemId: item.id,
              quantity,
              stockBefore: currentStock,
              stockAfter: updatedItem?.stockCurrent ?? null,
              reason: `Pagamento da OS #${serviceOrder.code}`,
            },
          });
        }

        const sale = await tx.sale.create({
          data: {
            clientId: serviceOrder.clientId,
            status: "CONCLUIDA",
            paymentMethod: payments[0].paymentMethod,
            subtotal: serviceOrder.subtotal,
            discountTotal: serviceOrder.discountTotal,
            feeTotal,
            total: totalPaid,
            responsible: serviceOrder.responsible ?? "PDV",
            notes: `Pagamento da ordem de serviço #${serviceOrder.code}`,
            items: {
              create: serviceOrder.items.map((item) => ({
                catalogItemId: item.catalogItemId,
                description: item.catalogItem?.name ?? item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total: new Prisma.Decimal(item.quantity).mul(item.unitPrice).minus(item.discount),
              })),
            },
            payments: {
              create: payments.map((payment) => ({
                paymentMethod: payment.paymentMethod,
                amount: payment.amount,
                feeAmount: payment.feeAmount,
                netAmount: payment.amount.minus(payment.feeAmount),
              })),
            },
          },
          include: salePaymentInclude,
        });

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
            paidAmount: serviceOrder.total,
            paymentMethod: payments[0].paymentMethod,
            notes: `Conta baixada automaticamente pelo pagamento da OS #${serviceOrder.code} via PDV.`,
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

        const updatedServiceOrder = await tx.serviceOrder.update({
          where: {
            id: serviceOrder.id,
          },
          data: {
            status: "PAGA",
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
      return serviceError("Venda não encontrada.", 404);
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
