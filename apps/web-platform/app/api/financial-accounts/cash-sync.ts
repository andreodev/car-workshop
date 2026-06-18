import { Prisma, type FinancialAccountType } from "@prisma/client";

async function ensureFinancialCategory(
  tx: Prisma.TransactionClient,
  tenantId: string,
  name: string,
  type: FinancialAccountType
) {
  return tx.financialCategory.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name,
      },
    },
    update: {
      type: type === "RECEBER" ? "RECEITA" : "DESPESA",
      active: true,
    },
    create: {
      tenantId,
      name,
      type: type === "RECEBER" ? "RECEITA" : "DESPESA",
    },
    select: { id: true },
  });
}

export async function syncFinancialAccountCashMovement(
  tx: Prisma.TransactionClient,
  financialAccountId: string,
  tenantId: string
) {
  const account = await tx.financialAccount.findFirst({
    where: { id: financialAccountId, tenantId },
    select: {
      id: true,
      tenantId: true,
      code: true,
      type: true,
      status: true,
      amount: true,
      paidAmount: true,
      description: true,
      category: true,
      documentNumber: true,
      paymentMethod: true,
      client: { select: { name: true } },
      supplier: { select: { name: true } },
      serviceOrder: { select: { code: true } },
      supplierOrder: { select: { code: true } },
    },
  });

  if (!account) {
    return;
  }

  const movements = await tx.cashMovement.findMany({
    where: { financialAccountId, tenantId },
    select: {
      type: true,
      amount: true,
    },
  });

  const currentBalance = movements.reduce((total, movement) => {
    const amount = new Prisma.Decimal(movement.amount);
    return movement.type === "ENTRADA" ? total.add(amount) : total.sub(amount);
  }, new Prisma.Decimal(0));

  const paidAmount = account.paidAmount ?? account.amount;
  const targetBalance =
    account.status === "PAGA" && new Prisma.Decimal(paidAmount).greaterThan(0)
      ? account.type === "RECEBER"
        ? new Prisma.Decimal(paidAmount)
        : new Prisma.Decimal(paidAmount).neg()
      : new Prisma.Decimal(0);
  const delta = targetBalance.sub(currentBalance);

  if (delta.equals(0)) {
    return;
  }

  const movementType = delta.greaterThan(0) ? "ENTRADA" : "SAIDA";
  const amount = delta.abs();
  const isReversal = account.status !== "PAGA" || targetBalance.equals(0);

  const category = await ensureFinancialCategory(
    tx,
    tenantId,
    account.category ??
      (movementType === "ENTRADA"
        ? account.type === "PAGAR"
          ? "Estornos de pagamentos"
          : "Recebimentos"
        : account.type === "RECEBER"
          ? "Estornos de recebimentos"
          : "Pagamentos"),
    movementType === "ENTRADA" ? "RECEBER" : "PAGAR"
  );

  await tx.cashMovement.create({
    data: {
      tenantId,
      type: movementType,
      categoryId: category.id,
      financialAccountId,
      description:
        isReversal
          ? account.serviceOrder?.code
            ? `Estorno pagamento OS #${account.serviceOrder.code}`
            : account.supplierOrder?.code
              ? `Estorno pagamento pedido #${account.supplierOrder.code}`
              : `Estorno pagamento conta #${account.code}`
          : account.serviceOrder?.code
            ? `Pagamento OS #${account.serviceOrder.code}`
            : account.supplierOrder?.code
              ? `Pagamento pedido #${account.supplierOrder.code}`
              : `Pagamento conta #${account.code}`,
      movementDate: new Date(),
      amount,
      paymentMethod: account.paymentMethod,
      documentNumber: account.documentNumber ?? `FIN-${account.code}`,
      notes: account.client?.name
        ? `Cliente: ${account.client.name}`
        : account.supplier?.name
          ? `Fornecedor: ${account.supplier.name}`
          : account.description,
    },
  });
}
