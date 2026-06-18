import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

type FindPaginatedParams = {
  where: Prisma.VehicleWhereInput;
  page: number;
  pageSize: number;
};

export const vehicleRepository = {
  async findPaginated({ where, page, pageSize }: FindPaginatedParams) {
    const [total, items] = await prisma.$transaction([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      items,
    };
  },

  async findClientById(clientId: string, tenantId: string) {
    return prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
      },
      select: {
        id: true,
      },
    });
  },

  async create(data: Prisma.VehicleCreateInput) {
    return prisma.vehicle.create({
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async findById(id: string, tenantId: string) {
    return prisma.vehicle.findFirst({
      where: { id, tenantId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async update(id: string, tenantId: string, data: Prisma.VehicleUpdateInput) {
    await prisma.vehicle.updateMany({
      where: { id, tenantId },
      data,
    });

    return prisma.vehicle.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async remove(id: string, tenantId: string) {
    return prisma.vehicle.deleteMany({
      where: { id, tenantId },
    });
  },
};
