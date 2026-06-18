import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { syncServiceOrderReceivable } from "../financial-sync";
import { syncServiceOrderStockMovements } from "../stock-sync";

type FindPaginatedParams = {
  where: Prisma.ServiceOrderWhereInput;
  page: number;
  pageSize: number;
};

export const vehicleInspectionInclude = {
  select: {
    id: true,
    token: true,
    status: true,
    notes: true,
    completedAt: true,
    createdAt: true,
    photos: {
      select: {
        id: true,
        url: true,
        filename: true,
        contentType: true,
        size: true,
        caption: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" as const },
    },
  },
} satisfies Prisma.ServiceOrder$vehicleInspectionArgs;

export const serviceOrderInclude = {
  items: {
    include: {
      catalogItem: {
        select: { id: true, code: true, name: true, type: true, stockCurrent: true },
      },
      mechanic: {
        select: { id: true, name: true },
      },
      sector: {
        select: { id: true, name: true },
      },
    },
  },
  client: { select: { id: true, name: true } },
  vehicle: { select: { id: true, plate: true, model: true } },
  mechanic: { select: { id: true, name: true } },
  estimateConversion: { select: { id: true, code: true, status: true } },
  vehicleInspection: vehicleInspectionInclude,
} satisfies Prisma.ServiceOrderInclude;

async function findSyncedServiceOrder(tx: Prisma.TransactionClient, id: string) {
  const order = await tx.serviceOrder.findUnique({
    where: { id },
    include: serviceOrderInclude,
  });

  if (!order) {
    throw new Error("Ordem de serviço não encontrada após sincronização.");
  }

  return order;
}

export const serviceOrderRepository = {
  async findPaginated({ where, page, pageSize }: FindPaginatedParams) {
    const [total, items] = await prisma.$transaction([
      prisma.serviceOrder.count({ where }),
      prisma.serviceOrder.findMany({
        where,
        include: serviceOrderInclude,
        orderBy: [{ createdAt: "desc" }, { code: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      items,
    };
  },

  async findCatalogItemsByIds(ids: string[]) {
    return prisma.catalogItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, type: true, active: true },
    });
  },

  async findClientById(clientId: string) {
    return prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
  },

  async findVehicleById(vehicleId: string) {
    return prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, clientId: true },
    });
  },

  async findMechanicById(mechanicId: string) {
    return prisma.mechanic.findUnique({
      where: { id: mechanicId },
      select: { id: true, active: true },
    });
  },

  async findMechanicsByIds(ids: string[]) {
    return prisma.mechanic.findMany({
      where: { id: { in: ids } },
      select: { id: true, active: true },
    });
  },

  async findSectorsByIds(ids: string[]) {
    return prisma.sector.findMany({
      where: { id: { in: ids } },
      select: { id: true, active: true },
    });
  },

  async findById(id: string) {
    return prisma.serviceOrder.findUnique({
      where: { id },
      include: serviceOrderInclude,
    });
  },

  async exists(id: string) {
    return prisma.serviceOrder.findUnique({
      where: { id },
      select: { id: true },
    });
  },

  async createWithSync(data: Prisma.ServiceOrderCreateInput) {
    return prisma.$transaction(async (tx) => {
      const createdOrder = await tx.serviceOrder.create({
        data,
        include: serviceOrderInclude,
      });

      await syncServiceOrderReceivable(tx, createdOrder.id);
      await syncServiceOrderStockMovements(tx, createdOrder.id);

      return findSyncedServiceOrder(tx, createdOrder.id);
    });
  },

  async updateWithSync(id: string, data: Prisma.ServiceOrderUpdateInput) {
    return prisma.$transaction(
      async (tx) => {
        const updatedOrder = await tx.serviceOrder.update({
          where: { id },
          data,
          include: serviceOrderInclude,
        });

        await syncServiceOrderReceivable(tx, id);
        await syncServiceOrderStockMovements(tx, id);

        return findSyncedServiceOrder(tx, updatedOrder.id);
      },
      {
        timeout: 15000,
        maxWait: 15000,
      },
    );
  },

  async updateStatusWithSync(id: string, status: Prisma.ServiceOrderUpdateInput["status"]) {
    return prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.serviceOrder.update({
        where: { id },
        data: { status },
        include: serviceOrderInclude,
      });

      await syncServiceOrderReceivable(tx, id);
      await syncServiceOrderStockMovements(tx, id);

      return findSyncedServiceOrder(tx, updatedOrder.id);
    });
  },

  async cancelWithSync(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.serviceOrder.update({
        where: { id },
        data: { status: "CANCELADA" },
      });

      await syncServiceOrderReceivable(tx, id);
      await syncServiceOrderStockMovements(tx, id);
    });
  },
};
