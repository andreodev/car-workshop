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
  try {
    console.log("[ESTIMATE_TO_OS] Iniciando conversão...");

    const session = await getServerAuthSession();
    const { id } = await params;

    console.log("[ESTIMATE_TO_OS] Params:", { id });
    console.log("[ESTIMATE_TO_OS] Session:", {
      hasUser: !!session?.user,
      userId: session?.user?.id,
    });

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
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

    console.log("[ESTIMATE_TO_OS] Orçamento encontrado:", {
      found: !!estimate,
      id: estimate?.id,
      status: estimate?.status,
      clientId: estimate?.clientId,
      vehicleId: estimate?.vehicleId,
      mechanicId: estimate?.mechanicId,
      items: estimate?.items?.length,
      convertedServiceOrderId: estimate?.convertedServiceOrderId,
    });

    if (!estimate) {
      return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    if (estimate.convertedServiceOrderId) {
      return Response.json({ error: "Orçamento já convertido em OS." }, { status: 400 });
    }

    if (estimate.status !== "APROVADO") {
      return Response.json(
        { error: "Apenas orçamentos aprovados podem virar OS." },
        { status: 400 }
      );
    }

    if (estimate.items.length === 0) {
      return Response.json({ error: "Orçamento sem itens." }, { status: 400 });
    }

    const itemWithoutCatalog = estimate.items.find(
      (item) => !item.catalogItemId || !item.catalogItem
    );

    if (itemWithoutCatalog) {
      console.log("[ESTIMATE_TO_OS] Item sem catálogo:", itemWithoutCatalog);

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

    console.log("[ESTIMATE_TO_OS] Iniciando transaction:", {
      estimateId: estimate.id,
      mechanicId,
    });

    const result = await prisma.$transaction(async (tx) => {
      console.log("[ESTIMATE_TO_OS] Criando OS...");

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
      });

      console.log("[ESTIMATE_TO_OS] OS criada:", {
        orderId: order.id,
        code: order.code,
      });

      console.log("[ESTIMATE_TO_OS] Atualizando orçamento...");

      const updatedEstimate = await tx.estimate.update({
        where: { id: estimate.id },
        data: {
          status: "CONVERTIDO",
          convertedServiceOrder: { connect: { id: order.id } },
        },
      });

      console.log("[ESTIMATE_TO_OS] Orçamento atualizado:", {
        estimateId: updatedEstimate.id,
        status: updatedEstimate.status,
        convertedServiceOrderId: updatedEstimate.convertedServiceOrderId,
      });

      return { order, estimate: updatedEstimate };
    });

    console.log("[ESTIMATE_TO_OS] Conversão finalizada com sucesso.");

    return Response.json(JSON.parse(JSON.stringify(result)), { status: 201 });
  } catch (error) {
    console.error("[ESTIMATE_TO_OS] Erro ao converter orçamento para OS:", error);

    return Response.json(
      {
        error: "Erro ao converter orçamento para ordem de serviço.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
