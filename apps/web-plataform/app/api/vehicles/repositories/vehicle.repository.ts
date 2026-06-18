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

  async findClientById(clientId: string) {
    return prisma.client.findUnique({
      where: {
        id: clientId,
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

  async findById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
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

async update(id: string, data: Prisma.VehicleUpdateInput) {
  return prisma.vehicle.update({
    where: { id },
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

async remove(id: string) {
  return prisma.vehicle.delete({
    where: { id },
  });
},
};