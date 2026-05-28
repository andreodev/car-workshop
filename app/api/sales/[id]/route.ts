import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const paymentMethods = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
] as const;

type PdvPaymentMethod = (typeof paymentMethods)[number];

type ParsedPayment = {
  paymentMethod: PdvPaymentMethod;
  amount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isPdvPaymentMethod(method: unknown): method is PdvPaymentMethod {
  return (
    typeof method === "string" &&
    paymentMethods.includes(method as PdvPaymentMethod)
  );
}

function normalizePaymentMethod(value: unknown): PdvPaymentMethod | null {
  const normalized = normalizeString(value);

  if (!normalized) return null;
  if (!isPdvPaymentMethod(normalized)) return null;

  return normalized;
}

function normalizeDecimal(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  return new Prisma.Decimal(parsed);
}

function normalizePayments(value: unknown): ParsedPayment[] | null {
  if (!Array.isArray(value)) return null;

  const payments: ParsedPayment[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const record = item as Record<string, unknown>;

    const paymentMethod = normalizePaymentMethod(record.paymentMethod);
    if (!paymentMethod) return null;

    const amount = normalizeDecimal(record.amount);
    const feeAmount = normalizeDecimal(record.feeAmount ?? 0);

    if (!amount || amount.lessThanOrEqualTo(0)) return null;
    if (!feeAmount || feeAmount.lessThan(0)) return null;

    payments.push({
      paymentMethod,
      amount,
      feeAmount,
    });
  }

  return payments;
}

function normalizePaymentsFromPayload(
  payload: Record<string, unknown>,
  fallbackTotal: Prisma.Decimal
): ParsedPayment[] | null {
  const payments = normalizePayments(payload.payments);

  if (payments?.length) return payments;

  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  if (!paymentMethod) return null;

  return [
    {
      paymentMethod,
      amount: fallbackTotal,
      feeAmount: new Prisma.Decimal(0),
    },
  ];
}

function sumPaymentAmounts(payments: ParsedPayment[]) {
  return payments.reduce(
    (acc, payment) => acc.plus(payment.amount),
    new Prisma.Decimal(0)
  );
}

function sumPaymentFees(payments: ParsedPayment[]) {
  return payments.reduce(
    (acc, payment) => acc.plus(payment.feeAmount),
    new Prisma.Decimal(0)
  );
}

function formatStock(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", {
        maximumFractionDigits: 3,
      })
    : "0";
}

function getNextWeeklyPaymentDate() {
  const date = new Date();
  const today = date.getDay();

  const friday = 5;
  const daysUntilFriday = (friday - today + 7) % 7 || 7;

  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(0, 0, 0, 0);

  return date;
}

class StockError extends Error {}

async function ensureServiceOrderCategory(tx: Prisma.TransactionClient) {
  return tx.financialCategory.upsert({
    where: {
      name: "Ordens de Serviço",
    },
    update: {
      type: "RECEITA",
      active: true,
    },
    create: {
      name: "Ordens de Serviço",
      type: "RECEITA",
    },
    select: {
      id: true,
    },
  });
}

async function ensurePdvCategory(tx: Prisma.TransactionClient) {
  return tx.financialCategory.upsert({
    where: {
      name: "Vendas PDV",
    },
    update: {
      type: "RECEITA",
      active: true,
    },
    create: {
      name: "Vendas PDV",
      type: "RECEITA",
    },
    select: {
      id: true,
    },
  });
}

const saleStockInclude = {
  items: {
    include: {
      catalogItem: true,
    },
  },
} satisfies Prisma.SaleInclude;

const saleInclude = {
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  items: true,
  payments: true,
} satisfies Prisma.SaleInclude;

async function createPaymentCashMovements(params: {
  tx: Prisma.TransactionClient;
  saleId: string;
  code: number | string;
  payments: ParsedPayment[];
  categoryId: string;
  description: string;
  documentNumber: string;
  notes: string;
}) {
  const {
    tx,
    saleId,
    code,
    payments,
    categoryId,
    description,
    documentNumber,
    notes,
  } = params;

  for (const payment of payments) {
    await tx.cashMovement.create({
      data: {
        type: "ENTRADA",
        categoryId,
        saleId,
        description,
        movementDate: new Date(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        documentNumber,
        notes: `${notes} | Venda #${code}`,
      },
    });
  }
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

  if (!serviceOrder.mechanic) return null;

  const commissionPercent = new Prisma.Decimal(
    serviceOrder.mechanic.commissionPercent ?? 0
  );

  if (commissionPercent.lessThanOrEqualTo(0)) return null;

  const serviceItemsTotal = serviceOrder.items.reduce((acc, item) => {
    const isService =
      item.type === "SERVICE" || item.catalogItem?.type === "SERVICO";

    if (!isService) return acc;

    return acc.plus(new Prisma.Decimal(item.total));
  }, new Prisma.Decimal(0));

  if (serviceItemsTotal.lessThanOrEqualTo(0)) return null;

  const commissionAmount = serviceItemsTotal
    .mul(commissionPercent)
    .div(100)
    .toDecimalPlaces(2);

  if (commissionAmount.lessThanOrEqualTo(0)) return null;

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

  if (existingCommission) return null;

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
        2
      )}% sobre serviços da OS #${serviceOrder.code}. Base: ${serviceItemsTotal.toFixed(
        2
      )}.`,
    },
  });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const serviceOrder = await prisma.serviceOrder.findUnique({
    where: {
      id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone1: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          modelYear: true,
          color: true,
        },
      },
      mechanic: {
        select: {
          id: true,
          name: true,
          commissionPercent: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          catalogItem: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              stockCurrent: true,
            },
          },
        },
      },
    },
  });

  if (!serviceOrder) {
    return Response.json(
      {
        error: "Ordem de serviço não encontrada.",
      },
      {
        status: 404,
      }
    );
  }

  return Response.json({
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
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;

  const serviceOrderId = normalizeString(payload.serviceOrderId);

  if (serviceOrderId) {
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: {
        id: serviceOrderId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone1: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            modelYear: true,
            color: true,
          },
        },
        mechanic: {
          select: {
            id: true,
            name: true,
            commissionPercent: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            catalogItem: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                stockCurrent: true,
              },
            },
          },
        },
      },
    });

    if (!serviceOrder) {
      return Response.json(
        {
          error: "Ordem de serviço não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (serviceOrder.status === "PAGA") {
      return Response.json(
        {
          error: "Esta ordem de serviço já foi paga.",
        },
        {
          status: 400,
        }
      );
    }

    const payments = normalizePaymentsFromPayload(payload, serviceOrder.total);

    if (!payments?.length) {
      return Response.json(
        {
          error: "Nenhuma forma de pagamento válida foi informada.",
        },
        {
          status: 400,
        }
      );
    }

    const totalPaid = sumPaymentAmounts(payments);
    const feeTotal = sumPaymentFees(payments);
    const expectedTotal = new Prisma.Decimal(serviceOrder.total).plus(feeTotal);

    if (!totalPaid.equals(expectedTotal)) {
      return Response.json(
        {
          error: "Total pago inválido.",
          details: `Total esperado: ${expectedTotal.toFixed(
            2
          )}. Total recebido: ${totalPaid.toFixed(2)}.`,
        },
        {
          status: 400,
        }
      );
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
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

          if (!catalogItem) continue;

          const quantity = new Prisma.Decimal(item.quantity);
          const currentStock = new Prisma.Decimal(
            catalogItem.stockCurrent ?? 0
          );

          if (currentStock.lessThan(quantity)) {
            throw new StockError(
              `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(
                currentStock
              )}. Solicitado: ${formatStock(quantity)}.`
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
              `Estoque insuficiente para ${catalogItem.name}. Atualize a ordem de serviço e tente novamente.`
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
                total: new Prisma.Decimal(item.quantity)
                  .mul(item.unitPrice)
                  .minus(item.discount),
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
          include: saleInclude,
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

        const mechanicCommissionPayable =
          await createMechanicCommissionPayable({
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

      return Response.json(result);
    } catch (error) {
      return Response.json(
        {
          error: "Erro ao finalizar pagamento da ordem de serviço.",
          details:
            error instanceof Error ? error.message : JSON.stringify(error),
        },
        {
          status: 500,
        }
      );
    }
  }

  const currentSale = await prisma.sale.findUnique({
    where: {
      id,
    },
    include: saleStockInclude,
  });

  if (!currentSale) {
    return Response.json(
      {
        error: "Venda não encontrada.",
      },
      {
        status: 404,
      }
    );
  }

  const payments = normalizePaymentsFromPayload(payload, currentSale.total);

  if (!payments?.length) {
    return Response.json(
      {
        error: "Nenhuma forma de pagamento válida foi informada.",
      },
      {
        status: 400,
      }
    );
  }

  const totalPaid = sumPaymentAmounts(payments);
  const feeTotal = sumPaymentFees(payments);
  const expectedTotal = new Prisma.Decimal(currentSale.total).plus(feeTotal);

  if (!totalPaid.equals(expectedTotal)) {
    return Response.json(
      {
        error: "Total pago inválido.",
        details: `Total esperado: ${expectedTotal.toFixed(
          2
        )}. Total recebido: ${totalPaid.toFixed(2)}.`,
      },
      {
        status: 400,
      }
    );
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
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

        if (!catalogItem) continue;

        const quantity = new Prisma.Decimal(item.quantity);
        const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);

        if (currentStock.lessThan(quantity)) {
          throw new StockError(
            `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(
              currentStock
            )}. Solicitado: ${formatStock(quantity)}.`
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
            `Estoque insuficiente para ${catalogItem.name}. Atualize a venda e tente novamente.`
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
        include: saleInclude,
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

    return Response.json(sale);
  } catch (error) {
    return Response.json(
      {
        error: "Erro ao finalizar venda.",
        details: error instanceof Error ? error.message : JSON.stringify(error),
      },
      {
        status: 500,
      }
    );
  }
}