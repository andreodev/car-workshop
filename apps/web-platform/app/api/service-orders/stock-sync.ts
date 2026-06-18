import { Prisma } from "@prisma/client";

class ServiceOrderStockError extends Error {}

function formatStock(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
    : "0";
}

async function createServiceOrderStockMovement(
  tx: Prisma.TransactionClient,
  data: {
    tenantId: string;
    type: "SAIDA" | "ESTORNO";
    catalogItemId: string;
    serviceOrderId: string;
    serviceOrderItemId: string | null;
    quantity: Prisma.Decimal;
    stockBefore: Prisma.Decimal | null;
    stockAfter: Prisma.Decimal | null;
    reason: string;
    notes: string | null;
  }
) {
  await tx.stockMovement.create({ data });
}

async function decrementStock(
  tx: Prisma.TransactionClient,
  catalogItemId: string,
  quantity: Prisma.Decimal,
  tenantId: string
) {
  const catalogItem = await tx.catalogItem.findFirst({
    where: { id: catalogItemId, tenantId },
    select: { id: true, name: true, stockCurrent: true },
  });

  if (!catalogItem) {
    throw new ServiceOrderStockError("Produto da OS não encontrado.");
  }

  const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);
  if (currentStock.lessThan(quantity)) {
    throw new ServiceOrderStockError(
      `Estoque insuficiente para ${catalogItem.name}. Disponível: ${formatStock(currentStock)}. Solicitado: ${formatStock(quantity)}.`
    );
  }

  const updateResult = await tx.catalogItem.updateMany({
    where: {
      id: catalogItem.id,
      tenantId,
      stockCurrent: { not: null, gte: quantity },
    },
    data: {
      stockCurrent: { decrement: quantity },
    },
  });

  if (updateResult.count !== 1) {
    throw new ServiceOrderStockError(
      `Estoque insuficiente para ${catalogItem.name}. Atualize a OS e tente novamente.`
    );
  }

  const updatedItem = await tx.catalogItem.findFirst({
    where: { id: catalogItem.id, tenantId },
    select: { stockCurrent: true },
  });

  return {
    stockBefore: currentStock,
    stockAfter: updatedItem?.stockCurrent ?? null,
  };
}

async function incrementStock(
  tx: Prisma.TransactionClient,
  catalogItemId: string,
  quantity: Prisma.Decimal,
  tenantId: string
) {
  const catalogItem = await tx.catalogItem.findFirst({
    where: { id: catalogItemId, tenantId },
    select: { id: true, stockCurrent: true },
  });

  if (!catalogItem) {
    return {
      stockBefore: null,
      stockAfter: null,
    };
  }

  const currentStock = new Prisma.Decimal(catalogItem.stockCurrent ?? 0);

  if (catalogItem.stockCurrent === null) {
    await tx.catalogItem.updateMany({
      where: { id: catalogItem.id, tenantId },
      data: { stockCurrent: quantity },
    });
  } else {
    await tx.catalogItem.updateMany({
      where: { id: catalogItem.id, tenantId },
      data: { stockCurrent: { increment: quantity } },
    });
  }

  const updatedItem = await tx.catalogItem.findFirst({
    where: { id: catalogItem.id, tenantId },
    select: { stockCurrent: true },
  });

  return {
    stockBefore: currentStock,
    stockAfter: updatedItem?.stockCurrent ?? null,
  };
}

export async function syncServiceOrderStockMovements(
  tx: Prisma.TransactionClient,
  serviceOrderId: string,
  tenantId: string
) {
  const order = await tx.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
    include: {
      items: {
        include: {
          catalogItem: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!order) {
    return;
  }

  const movements = await tx.stockMovement.findMany({
    where: {
      serviceOrderId,
      tenantId,
      type: { in: ["SAIDA", "ESTORNO"] },
    },
    select: {
      id: true,
      type: true,
      catalogItemId: true,
      serviceOrderItemId: true,
      quantity: true,
      notes: true,
    },
  });

  const currentByKey = new Map<
    string,
    {
      catalogItemId: string;
      serviceOrderItemId: string | null;
      description: string | null;
      quantity: Prisma.Decimal;
    }
  >();

  movements.forEach((movement) => {
    const key = `${movement.catalogItemId}:${movement.notes ?? ""}`;
    const current = currentByKey.get(key) ?? {
      catalogItemId: movement.catalogItemId,
      serviceOrderItemId: movement.serviceOrderItemId,
      description: movement.notes,
      quantity: new Prisma.Decimal(0),
    };
    const quantity = new Prisma.Decimal(movement.quantity);
    current.quantity =
      movement.type === "SAIDA" ? current.quantity.add(quantity) : current.quantity.sub(quantity);
    currentByKey.set(key, current);
  });

  const targetByKey = new Map<
    string,
    {
      catalogItemId: string;
      serviceOrderItemId: string;
      description: string;
      quantity: Prisma.Decimal;
    }
  >();

  if (order.status === "FINALIZADA") {
    order.items.forEach((item) => {
      if (item.type !== "PRODUCT") {
        return;
      }

      if (!item.catalogItemId || item.catalogItem?.type !== "PRODUTO") {
        throw new ServiceOrderStockError(
          `Produto inválido no item "${item.description}". Selecione um produto do catálogo.`
        );
      }

      const key = `${item.catalogItemId}:${item.description}`;
      const currentTarget = targetByKey.get(key);
      const quantity = new Prisma.Decimal(item.quantity);

      if (currentTarget) {
        currentTarget.quantity = currentTarget.quantity.add(quantity);
        return;
      }

      targetByKey.set(key, {
        catalogItemId: item.catalogItemId,
        serviceOrderItemId: item.id,
        description: item.description,
        quantity,
      });
    });
  }

  for (const [key, target] of targetByKey) {
    const current = currentByKey.get(key);
    const currentQuantity = current?.quantity ?? new Prisma.Decimal(0);
    const delta = target.quantity.sub(currentQuantity);

    if (delta.equals(0)) {
      continue;
    }

    if (delta.greaterThan(0)) {
      const stock = await decrementStock(tx, target.catalogItemId, delta, tenantId);
      await createServiceOrderStockMovement(tx, {
        tenantId,
        type: "SAIDA",
        catalogItemId: target.catalogItemId,
        serviceOrderId: order.id,
        serviceOrderItemId: target.serviceOrderItemId,
        quantity: delta,
        stockBefore: stock.stockBefore,
        stockAfter: stock.stockAfter,
        reason: `OS #${order.code}`,
        notes: target.description,
      });
      continue;
    }

    const quantity = delta.abs();
    const stock = await incrementStock(tx, target.catalogItemId, quantity, tenantId);
    await createServiceOrderStockMovement(tx, {
      tenantId,
      type: "ESTORNO",
      catalogItemId: target.catalogItemId,
      serviceOrderId: order.id,
      serviceOrderItemId: target.serviceOrderItemId,
      quantity,
      stockBefore: stock.stockBefore,
      stockAfter: stock.stockAfter,
      reason: `Estorno OS #${order.code}`,
      notes: target.description,
    });
  }

  for (const [key, current] of currentByKey) {
    if (targetByKey.has(key) || current.quantity.lessThanOrEqualTo(0)) {
      continue;
    }

    const stock = await incrementStock(tx, current.catalogItemId, current.quantity, tenantId);
    await createServiceOrderStockMovement(tx, {
      tenantId,
      type: "ESTORNO",
      catalogItemId: current.catalogItemId,
      serviceOrderId: order.id,
      serviceOrderItemId: current.serviceOrderItemId,
      quantity: current.quantity,
      stockBefore: stock.stockBefore,
      stockAfter: stock.stockAfter,
      reason: `Estorno OS #${order.code}`,
      notes: current.description,
    });
  }
}

export { ServiceOrderStockError };
