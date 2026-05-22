import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!estimate) {
    return Response.json({ error: "Orcamento nao encontrado." }, { status: 404 });
  }

  if (estimate.convertedServiceOrderId) {
    return Response.json({ error: "Orcamento ja convertido em OS." }, { status: 400 });
  }

  if (estimate.status === "REJEITADO" || estimate.status === "CANCELADO") {
    return Response.json(
      { error: "Orcamentos rejeitados ou cancelados nao podem virar OS." },
      { status: 400 }
    );
  }

  if (estimate.items.length === 0) {
    return Response.json({ error: "Orcamento sem itens." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.create({
      data: {
        client: { connect: { id: estimate.clientId } },
        vehicle: { connect: { id: estimate.vehicleId } },
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
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, model: true } },
      },
    });

    const updatedEstimate = await tx.estimate.update({
      where: { id: estimate.id },
      data: {
        status: "CONVERTIDO",
        convertedServiceOrder: { connect: { id: order.id } },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, model: true } },
        convertedServiceOrder: { select: { id: true, code: true } },
      },
    });

    return { order, estimate: updatedEstimate };
  });

  return Response.json(JSON.parse(JSON.stringify(result)), { status: 201 });
}
