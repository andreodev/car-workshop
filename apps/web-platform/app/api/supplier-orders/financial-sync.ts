import { Prisma } from "@prisma/client";

const SUPPLIER_ORDER_CATEGORY = "Compras de Fornecedores";

export async function syncSupplierOrderPayable(
  tx: Prisma.TransactionClient,
  supplierOrderId: string,
  tenantId: string
) {
  const order = await tx.supplierOrder.findFirst({
    where: { id: supplierOrderId, tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      financialAccount: { select: { id: true, status: true } },
    },
  });

  if (!order) {
    return;
  }

  const total = new Prisma.Decimal(order.total);

  if (order.status !== "RECEBIDO" || total.lessThanOrEqualTo(0)) {
    if (order.financialAccount && order.financialAccount.status !== "PAGA") {
      await tx.financialAccount.updateMany({
        where: { id: order.financialAccount.id, tenantId },
        data: {
          status: "CANCELADA",
          paymentDate: null,
          paidAmount: null,
        },
      });
    }

    return;
  }

  const payableData = {
    type: "PAGAR" as const,
    status: "ABERTA" as const,
    description: `Pedido fornecedor #${order.code}`,
    supplierId: order.supplierId,
    counterparty: order.supplier.name,
    category: SUPPLIER_ORDER_CATEGORY,
    documentNumber: order.invoiceNumber ?? `PED-${order.code}`,
    dueDate: order.forecastAt,
    amount: order.total,
    notes: order.internalDescription ?? order.observation,
  };

  if (!order.financialAccount) {
    await tx.financialAccount.create({
      data: {
        ...payableData,
        tenantId,
        supplierOrderId: order.id,
      },
    });
    return;
  }

  if (order.financialAccount.status === "PAGA") {
    return;
  }

  await tx.financialAccount.updateMany({
    where: { id: order.financialAccount.id, tenantId },
    data: {
      ...payableData,
      paymentDate: null,
      paidAmount: null,
    },
  });
}
