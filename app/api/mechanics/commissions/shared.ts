import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

const commissionStatuses = ["ABERTA", "VENCIDA"] as const;
const periodOptions = ["daily", "weekly", "monthly"] as const;

export type MechanicCommissionPeriod = (typeof periodOptions)[number];
export type MechanicCommissionSourceItem = {
  id: string;
  description: string;
  type: "SERVICE" | "PRODUCT";
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  commissionBase: string;
};
export type MechanicCommissionAccount = {
  id: string;
  code: number;
  description: string;
  documentNumber: string | null;
  dueDate: Date;
  amount: string;
  status: "ABERTA" | "VENCIDA";
  notes: string | null;
  commissionPercent: string | null;
  commissionBase: string;
  serviceOrder: {
    id: string;
    code: number;
    status: string;
    entryAt: Date;
    client: { id: string; name: string } | null;
    vehicle: {
      id: string;
      plate: string;
      brand: string | null;
      model: string | null;
    } | null;
    total: string;
    subtotal: string;
  } | null;
  sourceItems: MechanicCommissionSourceItem[];
};
export type MechanicCommissionGroup = {
  mechanicName: string;
  total: string;
  accountsCount: number;
  ordersCount: number;
  accounts: MechanicCommissionAccount[];
};

type CommissionReportParams = {
  period?: string | null;
  mechanicName?: string | null;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function normalizePeriod(value: string | null | undefined): MechanicCommissionPeriod {
  return periodOptions.includes(value as MechanicCommissionPeriod)
    ? (value as MechanicCommissionPeriod)
    : "weekly";
}

function buildPeriodRange(period: MechanicCommissionPeriod) {
  const now = new Date();

  if (period === "daily") {
    return {
      from: startOfDay(now),
      to: endOfDay(now),
      label: "Diario",
    };
  }

  if (period === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      from: startOfDay(from),
      to: endOfDay(to),
      label: "Mensal",
    };
  }

  const weekday = now.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const sundayOffset = mondayOffset + 6;
  const from = new Date(now);
  const to = new Date(now);

  from.setDate(now.getDate() + mondayOffset);
  to.setDate(now.getDate() + sundayOffset);

  return {
    from: startOfDay(from),
    to: endOfDay(to),
    label: "Semanal",
  };
}

function decimalToString(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0.00";
  }

  return new Prisma.Decimal(value).toFixed(2);
}

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function extractServiceOrderCode(account: {
  documentNumber: string | null;
  description: string;
  notes: string | null;
}) {
  const source = [account.documentNumber, account.description, account.notes]
    .filter(Boolean)
    .join(" ");
  const match = source.match(/OS(?:\s*#|\s*-)?\s*(\d+)/i);
  const code = match ? Number(match[1]) : Number.NaN;

  return Number.isInteger(code) && code > 0 ? code : null;
}

function serviceItemCommissionBase(item: {
  type: "SERVICE" | "PRODUCT";
  total: Prisma.Decimal;
  commissionBase: Prisma.Decimal | null;
  catalogItem: { type: "PRODUTO" | "SERVICO" } | null;
}) {
  if (item.commissionBase !== null && item.commissionBase !== undefined) {
    return new Prisma.Decimal(item.commissionBase);
  }

  const isService = item.type === "SERVICE" || item.catalogItem?.type === "SERVICO";
  return isService ? new Prisma.Decimal(item.total) : new Prisma.Decimal(0);
}

function deriveCommissionBaseFromAccount(
  amount: Prisma.Decimal,
  commissionPercent: Prisma.Decimal | null
) {
  if (!commissionPercent || commissionPercent.lessThanOrEqualTo(0)) {
    return null;
  }

  return new Prisma.Decimal(amount)
    .mul(100)
    .div(commissionPercent)
    .toDecimalPlaces(2);
}

function decimalToCents(value: Prisma.Decimal) {
  return Number(value.mul(100).toDecimalPlaces(0).toString());
}

function findSourceItemsForBase<
  T extends {
    commissionBaseValue: Prisma.Decimal;
  },
>(items: T[], targetBase: Prisma.Decimal) {
  const targetCents = decimalToCents(targetBase);

  if (targetCents <= 0 || items.length === 0) {
    return items;
  }

  const candidates = items
    .map((item, index) => ({
      item,
      index,
      cents: decimalToCents(item.commissionBaseValue),
    }))
    .filter((entry) => entry.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.index - b.index);

  const matches = new Map<number, number[]>([[0, []]]);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const currentMatches = Array.from(matches.entries());

    for (const [sum, selected] of currentMatches) {
      const nextSum = sum + candidate.cents;

      if (nextSum > targetCents || matches.has(nextSum)) {
        continue;
      }

      const nextSelected = [...selected, index];

      if (nextSum === targetCents) {
        const selectedIndexes = new Set(nextSelected);
        return candidates
          .filter((_, candidateIndex) => selectedIndexes.has(candidateIndex))
          .sort((a, b) => a.index - b.index)
          .map((entry) => entry.item);
      }

      matches.set(nextSum, nextSelected);
    }
  }

  return items;
}

function normalizeCommissionNotes(
  notes: string | null,
  commissionBase: Prisma.Decimal,
  shouldNormalize: boolean
) {
  if (!notes || !shouldNormalize || !/comiss/i.test(notes) || !/Base:\s*[\d.,]+/i.test(notes)) {
    return notes;
  }

  return notes.replace(/Base:\s*[\d.,]+/i, `Base: ${commissionBase.toFixed(2)}`);
}

export async function getMechanicCommissionReport(params: CommissionReportParams = {}) {
  const period = normalizePeriod(params.period);
  const periodRange = buildPeriodRange(period);
  const mechanicName = normalizeString(params.mechanicName);

  const accounts = await prisma.financialAccount.findMany({
    where: {
      type: "PAGAR",
      status: { in: [...commissionStatuses] },
      dueDate: {
        gte: periodRange.from,
        lte: periodRange.to,
      },
      ...(mechanicName ? { counterparty: mechanicName } : {}),
      OR: [
        { category: { equals: "Comissão mecânico", mode: "insensitive" } },
        { description: { contains: "Comissão do mecânico", mode: "insensitive" } },
        { notes: { contains: "Comissão de", mode: "insensitive" } },
      ],
    },
    orderBy: [{ counterparty: "asc" }, { dueDate: "asc" }, { code: "asc" }],
    take: 5000,
  });

  const serviceOrderCodes = Array.from(
    new Set(
      accounts
        .map((account) => extractServiceOrderCode(account))
        .filter((code): code is number => code !== null)
    )
  );

  const mechanicNames = Array.from(
    new Set(
      accounts
        .map((account) => normalizeString(account.counterparty))
        .filter((name): name is string => name !== null)
    )
  );

  const [orders, mechanics] = await Promise.all([
    serviceOrderCodes.length
      ? prisma.serviceOrder.findMany({
          where: { code: { in: serviceOrderCodes } },
          include: {
            client: { select: { id: true, name: true } },
            vehicle: { select: { id: true, plate: true, brand: true, model: true } },
            mechanic: {
              select: { id: true, name: true, commissionPercent: true },
            },
            items: {
              include: {
                mechanic: {
                  select: { id: true, name: true, commissionPercent: true },
                },
                catalogItem: { select: { type: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : Promise.resolve([]),
    mechanicNames.length
      ? prisma.mechanic.findMany({
          where: { name: { in: mechanicNames } },
          select: { id: true, name: true, commissionPercent: true },
        })
      : Promise.resolve([]),
  ]);

  const ordersByCode = new Map(orders.map((order) => [order.code, order]));
  const mechanicsByName = new Map(mechanics.map((mechanic) => [mechanic.name, mechanic]));

  const groups = new Map<
    string,
    {
      mechanicName: string;
      total: Prisma.Decimal;
      accountsCount: number;
      orderCodes: Set<number>;
      accounts: MechanicCommissionAccount[];
    }
  >();

  for (const account of accounts) {
    const groupName = normalizeString(account.counterparty) ?? "Sem mecanico";
    const serviceOrderCode = extractServiceOrderCode(account);
    const serviceOrder = serviceOrderCode ? ordersByCode.get(serviceOrderCode) : null;
    const mechanic = mechanicsByName.get(groupName);
    const commissionPercent =
      mechanic?.commissionPercent ??
      (serviceOrder?.mechanic?.name === groupName
        ? serviceOrder.mechanic.commissionPercent
        : null);

    const sourceItemsWithBase =
      serviceOrder?.items
        .filter((item) => {
          const itemMechanicName = item.mechanic?.name ?? serviceOrder.mechanic?.name ?? null;
          return itemMechanicName === groupName;
        })
        .map((item) => {
          const base = serviceItemCommissionBase(item);

          return {
            id: item.id,
            description: item.description,
            type: item.type,
            quantity: item.quantity,
            unitPrice: decimalToString(item.unitPrice),
            discount: decimalToString(item.discount),
            total: decimalToString(item.total),
            commissionBaseValue: base,
          };
        }) ?? [];

    const sourceItemsCommissionBase = sourceItemsWithBase.reduce(
      (sum, item) => sum.add(item.commissionBaseValue),
      new Prisma.Decimal(0)
    );
    const accountCommissionBase = deriveCommissionBaseFromAccount(
      account.amount,
      commissionPercent ?? null
    );
    const commissionBase = accountCommissionBase ?? sourceItemsCommissionBase;
    const hasAccountCommissionBaseOverride =
      accountCommissionBase !== null && !accountCommissionBase.equals(sourceItemsCommissionBase);
    const reconciledSourceItems =
      hasAccountCommissionBaseOverride
        ? findSourceItemsForBase(sourceItemsWithBase, accountCommissionBase)
        : sourceItemsWithBase;
    const sourceItems = reconciledSourceItems.map((item) => ({
      id: item.id,
      description: item.description,
      type: item.type,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total,
      commissionBase: decimalToString(item.commissionBaseValue),
    }));

    if (!groups.has(groupName)) {
      groups.set(groupName, {
        mechanicName: groupName,
        total: new Prisma.Decimal(0),
        accountsCount: 0,
        orderCodes: new Set(),
        accounts: [],
      });
    }

    const group = groups.get(groupName)!;
    group.total = group.total.add(account.amount);
    group.accountsCount += 1;

    if (serviceOrderCode) {
      group.orderCodes.add(serviceOrderCode);
    }

    group.accounts.push({
      id: account.id,
      code: account.code,
      description: account.description,
      documentNumber: account.documentNumber,
      dueDate: account.dueDate,
      amount: decimalToString(account.amount),
      status: account.status as "ABERTA" | "VENCIDA",
      notes: normalizeCommissionNotes(
        account.notes,
        commissionBase,
        hasAccountCommissionBaseOverride
      ),
      commissionPercent: commissionPercent ? decimalToString(commissionPercent) : null,
      commissionBase: decimalToString(commissionBase),
      serviceOrder: serviceOrder
        ? {
            id: serviceOrder.id,
            code: serviceOrder.code,
            status: serviceOrder.status,
            entryAt: serviceOrder.entryAt,
            client: serviceOrder.client,
            vehicle: serviceOrder.vehicle,
            total: decimalToString(serviceOrder.total),
            subtotal: decimalToString(serviceOrder.subtotal),
          }
        : null,
      sourceItems,
    });
  }

  const normalizedGroups = Array.from(groups.values())
    .map((group) => ({
      mechanicName: group.mechanicName,
      total: decimalToString(group.total),
      accountsCount: group.accountsCount,
      ordersCount: group.orderCodes.size,
      accounts: group.accounts,
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));

  const total = normalizedGroups.reduce(
    (sum, group) => sum.add(group.total),
    new Prisma.Decimal(0)
  );

  return {
    period,
    periodLabel: periodRange.label,
    from: periodRange.from,
    to: periodRange.to,
    summary: {
      total: decimalToString(total),
      mechanicsCount: normalizedGroups.length,
      accountsCount: accounts.length,
    },
    groups: normalizedGroups,
  };
}
