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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

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

  if (!normalized) {
    return null;
  }

  if (!isPdvPaymentMethod(normalized)) {
    return null;
  }

  return normalized;
}

function formatStock(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", {
        maximumFractionDigits: 3,
      })
    : "0";
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
} satisfies Prisma.SaleInclude;

async function createSaleCashMovement(
  tx: Prisma.TransactionClient,
  sale: {
    id: string;
    code: number | string;
    total: Prisma.Decimal;
    paymentMethod: PdvPaymentMethod | null;
  },
  type: "ENTRADA" | "SAIDA",
  description: string
) {
  if (!sale.paymentMethod) {
    throw new Error("Forma de pagamento não informada.");
  }

  const category = await ensureServiceOrderCategory(tx);

  return tx.cashMovement.create({
    data: {
      type,
      categoryId: category.id,
      saleId: sale.id,
      description,
      movementDate: new Date(),
      amount: sale.total,
      paymentMethod: sale.paymentMethod,
      documentNumber: `PDV-${sale.code}`,
      notes: "Movimento gerado automaticamente pelo PDV",
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

  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  if (!paymentMethod) {
    return Response.json(
      {
        error: "Forma de pagamento inválida.",
      },
      {
        status: 400,
      }
    );
  }

  const serviceOrderId = normalizeString(payload.serviceOrderId);

  if (serviceOrderId) {
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

          if (!catalogItem) {
            continue;
          }

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
            paymentMethod,
            subtotal: serviceOrder.subtotal,
            discountTotal: serviceOrder.discountTotal,
            total: serviceOrder.total,
            responsible: serviceOrder.responsible ?? "PDV",
            notes: `Pagamento da ordem de serviço #${serviceOrder.code}`,
            items: {
              create: serviceOrder.items.map((item) => ({
                catalogItemId: item.catalogItemId,
                description: item.catalogItem?.name ?? item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: new Prisma.Decimal(item.quantity).mul(item.unitPrice),
              })),
            },
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            items: true,
          },
        });

        const category = await ensureServiceOrderCategory(tx);

        await tx.cashMovement.create({
          data: {
            type: "ENTRADA",
            categoryId: category.id,
            saleId: sale.id,
            description: `Pagamento da ordem de serviço #${serviceOrder.code}`,
            movementDate: new Date(),
            amount: serviceOrder.total,
            paymentMethod,
            documentNumber: `OS-${serviceOrder.code}`,
            notes: "Pagamento realizado via PDV",
          },
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

        if (!catalogItem) {
          continue;
        }

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

      const updatedSale = await tx.sale.update({
        where: {
          id,
        },
        data: {
          status: "CONCLUIDA",
          paymentMethod,
        },
        include: saleInclude,
      });

      await createSaleCashMovement(
        tx,
        {
          id: updatedSale.id,
          code: updatedSale.code,
          total: updatedSale.total,
          paymentMethod,
        },
        "ENTRADA",
        `Venda PDV #${updatedSale.code}`
      );

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