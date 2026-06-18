import { Prisma } from "@prisma/client";

const SERVICE_ORDER_CATEGORY = "Ordens de Serviço";

function buildVehicleLabel(order: {
  vehicle: { plate: string; model: string | null } | null;
}) {
  if (!order.vehicle) {
    return null;
  }

  return [order.vehicle.plate, order.vehicle.model].filter(Boolean).join(" - ");
}

export async function syncServiceOrderReceivable(
  tx: Prisma.TransactionClient,
  serviceOrderId: string,
  tenantId: string
) {
  const order = await tx.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
    include: {
      client: { select: { id: true, name: true } },
      vehicle: { select: { plate: true, model: true } },
      financialAccount: { select: { id: true, status: true } },
    },
  });

  if (!order) {
    return;
  }

  const total = new Prisma.Decimal(order.total);

  if (order.status !== "FINALIZADA" || total.lessThanOrEqualTo(0)) {
    if (order.financialAccount && order.financialAccount.status !== "PAGA") {
      await tx.financialAccount.update({
        where: { id: order.financialAccount.id },
        data: {
          status: "CANCELADA",
          paymentDate: null,
          paidAmount: null,
        },
      });
    }

    return;
  }

  const vehicleLabel = buildVehicleLabel(order);
  const receivableData = {
    tenantId,
    type: "RECEBER" as const,
    status: "ABERTA" as const,
    description: `OS #${order.code}`,
    clientId: order.clientId,
    counterparty: order.client.name,
    category: SERVICE_ORDER_CATEGORY,
    documentNumber: `OS-${order.code}`,
    dueDate: new Date(),
    amount: order.total,
    notes: vehicleLabel ? `Veículo: ${vehicleLabel}` : null,
  };

  if (!order.financialAccount) {
    await tx.financialAccount.create({
      data: {
        ...receivableData,
        serviceOrderId: order.id,
      },
    });
    return;
  }

  if (order.financialAccount.status === "PAGA") {
    return;
  }

  await tx.financialAccount.update({
    where: { id: order.financialAccount.id },
    data: {
      ...receivableData,
      paymentDate: null,
      paidAmount: null,
    },
  });
}
