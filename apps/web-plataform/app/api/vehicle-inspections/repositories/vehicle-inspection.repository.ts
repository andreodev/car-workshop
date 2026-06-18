import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

export const vehicleInspectionInclude = {
  photos: { orderBy: { createdAt: "asc" } },
  serviceOrder: {
    select: {
      id: true,
      code: true,
      entryAt: true,
      client: { select: { name: true } },
      vehicle: {
        select: {
          plate: true,
          brand: true,
          model: true,
          version: true,
          color: true,
        },
      },
    },
  },
} satisfies Prisma.ServiceOrderVehicleInspectionInclude;

export type VehicleInspectionWithRelations = Prisma.ServiceOrderVehicleInspectionGetPayload<{
  include: typeof vehicleInspectionInclude;
}>;

export const vehicleInspectionRepository = {
  async findByToken(token: string) {
    return prisma.serviceOrderVehicleInspection.findUnique({
      where: { token },
      include: vehicleInspectionInclude,
    });
  },

  async complete(params: {
    id: string;
    notes: string | null;
    photos: Prisma.ServiceOrderVehicleInspectionPhotoCreateWithoutInspectionInput[];
  }) {
    const { id, notes, photos } = params;

    return prisma.serviceOrderVehicleInspection.update({
      where: { id },
      data: {
        notes,
        status: "CONCLUIDA",
        completedAt: new Date(),
        photos: {
          create: photos,
        },
      },
      include: vehicleInspectionInclude,
    });
  },
};
