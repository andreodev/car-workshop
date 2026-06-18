import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

type FindPaginatedParams = {
  where: Prisma.ClientWhereInput;
  page: number;
  pageSize: number;
};

export const clientRepository = {
  async findPaginated({ where, page, pageSize }: FindPaginatedParams) {
    const [total, items] = await prisma.$transaction([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
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

  async create(data: Prisma.ClientUncheckedCreateInput) {
    return prisma.client.create({
      data,
    });
  },

  async findById(id: string, tenantId: string) {
    return prisma.client.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  },

  async update(id: string, tenantId: string, data: Prisma.ClientUpdateInput) {
    await prisma.client.updateMany({
      where: {
        id,
        tenantId,
      },
      data,
    });

    return prisma.client.findFirstOrThrow({
      where: { id, tenantId },
    });
  },

  async remove(id: string, tenantId: string) {
    return prisma.client.deleteMany({
      where: {
        id,
        tenantId,
      },
    });
  },
};
