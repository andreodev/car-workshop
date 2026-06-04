import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import type { ParsedPayment } from "../utils/sale.normalizer";

type FindPaginatedParams = {
  where: Prisma.SaleWhereInput;
  page: number;
  pageSize: number;
};

export const saleListInclude = {
  client: { select: { id: true, name: true, mobile: true, phone1: true } },
  sector: { select: { id: true, name: true } },
  serviceOrder: {
    select: {
      id: true,
      code: true,
      mechanic: {
        select: {
          id: true,
          name: true,
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
    },
  },
  payments: {
    orderBy: { createdAt: "asc" },
  },
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      catalogItem: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.SaleInclude;

export const completedServiceOrderInclude = {
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      plate: true,
      model: true,
    },
  },
  mechanic: {
    select: {
      id: true,
      name: true,
    },
  },
  financialAccount: {
    select: {
      id: true,
      code: true,
      status: true,
      amount: true,
      dueDate: true,
      paymentDate: true,
      paidAmount: true,
      paymentMethod: true,
    },
  },
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      catalogItem: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.ServiceOrderInclude;

export const serviceOrderPdvInclude = {
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
      mechanic: {
        select: {
          id: true,
          name: true,
          commissionPercent: true,
        },
      },
    },
  },
} satisfies Prisma.ServiceOrderInclude;

export const saleStockInclude = {
  items: {
    include: {
      catalogItem: true,
    },
  },
} satisfies Prisma.SaleInclude;

export const salePaymentInclude = {
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
  payments: true,
} satisfies Prisma.SaleInclude;

export const saleRepository = {
  async findPaginated({ where, page, pageSize }: FindPaginatedParams) {
    const [total, items] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: saleListInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      items,
    };
  },

  async findCompletedServiceOrders(where: Prisma.ServiceOrderWhereInput) {
    return prisma.serviceOrder.findMany({
      where,
      include: completedServiceOrderInclude,
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  },

  async findClientById(clientId: string) {
    return prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
  },

  async findSectorById(sectorId: string) {
    return prisma.sector.findUnique({
      where: { id: sectorId },
      select: { id: true, name: true, active: true },
    });
  },

  async findCatalogItemsByIds(ids: string[]) {
    return prisma.catalogItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, type: true, stockCurrent: true },
    });
  },

  async findServiceOrderById(id: string) {
    return prisma.serviceOrder.findUnique({
      where: { id },
      include: serviceOrderPdvInclude,
    });
  },

  async findSaleForStock(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: saleStockInclude,
    });
  },

  async runTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(callback, {
      timeout: 15000,
      maxWait: 15000,
    });
  },
};

export async function ensurePdvCategory(tx: Prisma.TransactionClient) {
  return tx.financialCategory.upsert({
    where: { name: "Vendas PDV" },
    update: { type: "RECEITA", active: true },
    create: { name: "Vendas PDV", type: "RECEITA" },
    select: { id: true },
  });
}

export async function ensureServiceOrderCategory(tx: Prisma.TransactionClient) {
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

export async function createPaymentCashMovements(params: {
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
        saleId: params.saleId,
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
