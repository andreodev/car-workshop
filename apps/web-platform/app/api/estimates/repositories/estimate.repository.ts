import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

type FindPaginatedParams = {
  where: Prisma.EstimateWhereInput;
  page: number;
  pageSize: number;
};

export const catalogItemSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  stockCurrent: true,
} as const;

export const estimateListInclude = {
  client: { select: { id: true, name: true } },
  vehicle: { select: { id: true, plate: true, model: true } },
  mechanic: { select: { id: true, name: true } },
  convertedServiceOrder: { select: { id: true, code: true, status: true } },
} satisfies Prisma.EstimateInclude;

export const estimateDetailInclude = {
  items: {
    include: {
      catalogItem: { select: catalogItemSelect },
      mechanic: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true } },
    },
  },
  client: { select: { id: true, name: true } },
  vehicle: {
    select: {
      id: true,
      plate: true,
      brand: true,
      model: true,
      version: true,
      color: true,
      manufactureYear: true,
      modelYear: true,
    },
  },
  mechanic: { select: { id: true, name: true } },
  convertedServiceOrder: {
    select: {
      id: true,
      code: true,
      status: true,
      mechanic: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.EstimateInclude;

export const estimateConversionInclude = {
  items: {
    include: {
      catalogItem: { select: catalogItemSelect },
      mechanic: { select: { id: true, active: true } },
      sector: { select: { id: true, active: true } },
    },
  },
  mechanic: { select: { id: true, active: true } },
} satisfies Prisma.EstimateInclude;

export type EstimateForConversion = Prisma.EstimateGetPayload<{
  include: typeof estimateConversionInclude;
}>;

export const estimatePdfInclude = {
  items: {
    include: {
      catalogItem: {
        select: {
          id: true,
          name: true,
        },
      },
      mechanic: {
        select: {
          id: true,
          name: true,
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
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  vehicle: {
    select: {
      plate: true,
      brand: true,
      model: true,
      version: true,
    },
  },
  mechanic: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.EstimateInclude;

export const estimateRepository = {
  async findPaginated({ where, page, pageSize }: FindPaginatedParams) {
    const [total, items] = await prisma.$transaction([
      prisma.estimate.count({ where }),
      prisma.estimate.findMany({
        where,
        include: estimateListInclude,
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

  async create(data: Prisma.EstimateCreateInput) {
    return prisma.estimate.create({
      data,
      include: estimateDetailInclude,
    });
  },

  async findById(id: string) {
    return prisma.estimate.findUnique({
      where: { id },
      include: estimateDetailInclude,
    });
  },

  async update(id: string, data: Prisma.EstimateUpdateInput) {
    return prisma.estimate.update({
      where: { id },
      data,
      include: estimateDetailInclude,
    });
  },

  async updateStatus(id: string, data: Prisma.EstimateUpdateInput) {
    return prisma.estimate.update({
      where: { id },
      data,
      include: estimateDetailInclude,
    });
  },

  async remove(id: string) {
    return prisma.estimate.delete({
      where: { id },
    });
  },

  async findForConversion(id: string) {
    return prisma.estimate.findUnique({
      where: { id },
      include: estimateConversionInclude,
    });
  },

  async convertToServiceOrder(params: {
    estimate: EstimateForConversion;
    mechanicId: string;
    inspectionToken: string;
  }) {
    const { estimate, mechanicId, inspectionToken } = params;

    return prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          client: { connect: { id: estimate.clientId } },
          vehicle: { connect: { id: estimate.vehicleId } },
          mechanic: { connect: { id: mechanicId } },
          responsible: estimate.responsible,
          status: "ABERTA",
          entryAt: new Date(),
          estimatedAt: estimate.validUntil,
          notesInternal: estimate.notesInternal,
          notesClient: estimate.notesClient,
          subtotal: estimate.subtotal,
          discountTotal: estimate.discountTotal,
          total: estimate.total,
          items: {
            create: estimate.items.map((item) => ({
              type: item.catalogItem?.type === "PRODUTO" ? "PRODUCT" : "SERVICE",
              catalogItemId: item.catalogItemId,
              mechanicId: item.mechanicId ?? mechanicId,
              sectorId: item.sectorId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
              commissionBase: item.commissionBase,
            })),
          },
          vehicleInspection: {
            create: {
              token: inspectionToken,
            },
          },
        },
      });

      const updatedEstimate = await tx.estimate.update({
        where: { id: estimate.id },
        data: {
          status: "CONVERTIDO",
          convertedServiceOrder: { connect: { id: order.id } },
        },
      });

      return {
        order,
        estimate: updatedEstimate,
      };
    });
  },

  async findPdfDataById(id: string) {
    return prisma.estimate.findUnique({
      where: { id },
      include: estimatePdfInclude,
    });
  },

  async findCompanySettings(singletonKey: string) {
    return prisma.companySettings.findUnique({
      where: { singletonKey },
    });
  },
};
