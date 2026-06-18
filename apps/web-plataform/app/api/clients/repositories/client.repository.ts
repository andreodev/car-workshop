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

  async create(data: Prisma.ClientCreateInput) {
    return prisma.client.create({
      data,
    });
  },

  async findById(id: string) {
    return prisma.client.findUnique({
      where: {
        id,
      },
    });
  },

  async update(id: string, data: Prisma.ClientUpdateInput) {
    return prisma.client.update({
      where: {
        id,
      },
      data,
    });
  },

  async remove(id: string) {
    return prisma.client.delete({
      where: {
        id,
      },
    });
  },
};
