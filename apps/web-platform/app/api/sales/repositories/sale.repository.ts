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
      sector: {
        select: {
          id: true,
          name: true,
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
      sector: {
        select: {
          id: true,
          name: true,
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

  async summarizeCompletedServiceOrders(where: Prisma.ServiceOrderWhereInput) {
    return prisma.serviceOrder.aggregate({
      where,
      _sum: { total: true },
      _count: { _all: true },
    });
  },

  async findClientById(clientId: string, tenantId: string) {
    return prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
  },

  async findSectorById(sectorId: string, tenantId: string) {
    return prisma.sector.findFirst({
      where: { id: sectorId, tenantId },
      select: { id: true, name: true, active: true },
    });
  },

  async findCatalogItemsByIds(ids: string[], tenantId: string) {
    return prisma.catalogItem.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, name: true, type: true, stockCurrent: true },
    });
  },

  async findServiceOrderById(id: string, tenantId: string) {
    return prisma.serviceOrder.findFirst({
      where: { id, tenantId },
      include: serviceOrderPdvInclude,
    });
  },

  async findSaleForStock(id: string, tenantId: string) {
    return prisma.sale.findFirst({
      where: { id, tenantId },
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

export async function ensurePdvCategory(tx: Prisma.TransactionClient, tenantId: string) {
  return tx.financialCategory.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: "Vendas PDV",
      },
    },
    update: { tenantId, type: "RECEITA", active: true },
    create: { tenantId, name: "Vendas PDV", type: "RECEITA" },
    select: { id: true },
  });
}

export async function ensureServiceOrderCategory(tx: Prisma.TransactionClient, tenantId: string) {
  return tx.financialCategory.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: "Ordens de Serviço",
      },
    },
    update: {
      tenantId,
      type: "RECEITA",
      active: true,
    },
    create: {
      tenantId,
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
  tenantId: string;
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
        tenantId: params.tenantId,
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
