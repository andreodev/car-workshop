import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function createInspectionToken() {
  return randomBytes(24).toString("base64url");
}

const catalogItemSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  stockCurrent: true,
} as const;

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "NÃ£o autorizado." }, { status: 401 });
  }

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          catalogItem: { select: catalogItemSelect },
        },
      },
      mechanic: { select: { id: true, active: true } },
    },
  });

  if (!estimate) {
    return Response.json({ error: "OrÃ§amento nÃ£o encontrado." }, { status: 404 });
  }

  if (estimate.convertedServiceOrderId) {
    return Response.json({ error: "OrÃ§amento ja convertido em OS." }, { status: 400 });
  }

  if (estimate.status !== "APROVADO") {
    return Response.json(
      { error: "Apenas orçamentos aprovados podem virar OS." },
      { status: 400 }
    );
  }

  if (estimate.items.length === 0) {
    return Response.json({ error: "OrÃ§amento sem itens." }, { status: 400 });
  }

  const itemWithoutCatalog = estimate.items.find((item) => !item.catalogItemId || !item.catalogItem);
  if (itemWithoutCatalog) {
    return Response.json(
      { error: `Selecione um item do catálogo para "${itemWithoutCatalog.description}".` },
      { status: 400 }
    );
  }

  if (!estimate.mechanicId || !estimate.mechanic) {
    return Response.json(
      { error: "Atribua um mecânico antes de gerar a OS." },
      { status: 400 }
    );
  }

  if (!estimate.mechanic.active) {
    return Response.json(
      { error: "Mecânico inativo não pode receber OS." },
      { status: 400 }
    );
  }

  const mechanicId = estimate.mechanicId;

  const result = await prisma.$transaction(async (tx) => {
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
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
        },
        vehicleInspection: {
          create: {
            token: createInspectionToken(),
          },
        },
      },
      include: {
        items: {
          include: {
            catalogItem: { select: catalogItemSelect },
          },
        },
        client: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, model: true } },
        mechanic: { select: { id: true, name: true } },
        estimateConversion: { select: { id: true, code: true, status: true } },
        vehicleInspection: {
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
              orderBy: { createdAt: "asc" },
            },
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
      include: {
        items: {
          include: {
            catalogItem: { select: catalogItemSelect },
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
        sector: { select: { id: true, name: true } },
        convertedServiceOrder: {
          select: {
            id: true,
            code: true,
            status: true,
            mechanic: { select: { id: true, name: true } },
          },
        },
      },
    });

    return { order, estimate: updatedEstimate };
  });

  return Response.json(JSON.parse(JSON.stringify(result)), { status: 201 });
}
