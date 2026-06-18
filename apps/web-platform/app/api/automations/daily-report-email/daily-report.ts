import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { CashMovementType, FinancialAccountStatus, FinancialAccountType } from "@prisma/client";

import {
  getCashMovementTypeLabel,
  getFinancialStatusLabel,
  getFinancialTypeLabel,
  getPaymentMethodLabel,
} from "@/app/(app)/financeiro/status";
import { prisma } from "@/app/lib/prisma";
import { decimalToNumber, formatCurrency, formatDate } from "@/app/lib/reports";

const DEFAULT_TIME_ZONE = "America/Manaus";

const colors = {
  page: "#FFFFFF",
  text: "#111111",
  muted: "#4B4B4B",
  border: "#CCCCCC",
  good: "#047857",
  bad: "#BE123C",
};

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: colors.text,
    backgroundColor: colors.page,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: colors.muted,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 7,
  },
  summaryLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  summaryGood: {
    color: colors.good,
  },
  summaryBad: {
    color: colors.bad,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 5,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableEmpty: {
    paddingVertical: 12,
    color: colors.muted,
  },
  cell: {
    paddingRight: 4,
  },
  cellOrigin: {
    width: 48,
  },
  cellRegister: {
    flex: 2,
  },
  cellType: {
    width: 92,
  },
  cellCategory: {
    width: 110,
  },
  cellDate: {
    width: 62,
  },
  cellPayment: {
    width: 80,
  },
  cellAmount: {
    width: 72,
    textAlign: "right",
  },
  cellStatus: {
    width: 72,
  },
  headerText: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
  },
});

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type DailyReportRow = {
  id: string;
  kind: string;
  code: number | string;
  description: string;
  typeLabel: string;
  category: string;
  date: Date | null;
  paymentMethod: string;
  amount: number | null;
  status: string;
};

export type DailyReportData = {
  dateKey: string;
  dateLabel: string;
  timeZone: string;
  from: Date;
  to: Date;
  cash: {
    entries: number;
    exits: number;
    balance: number;
    movementCount: number;
  };
  accounts: {
    received: number;
    paid: number;
    openReceivable: number;
    openPayable: number;
    accountCount: number;
  };
  rows: DailyReportRow[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateKey(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function parseDateKey(dateKey: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function addDaysToDateKey(dateKey: string, days: number) {
  const parts = parseDateKey(dateKey);

  if (!parts) {
    return null;
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return formatDateKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function zonedMidnightToUtc(dateKey: string, timeZone: string) {
  const parts = parseDateKey(dateKey);

  if (!parts) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const firstOffset = getTimeZoneOffsetMs(timeZone, utcGuess);
  const firstResult = new Date(utcGuess.getTime() - firstOffset);
  const verifiedOffset = getTimeZoneOffsetMs(timeZone, firstResult);

  if (firstOffset !== verifiedOffset) {
    return new Date(utcGuess.getTime() - verifiedOffset);
  }

  return firstResult;
}

function getDailyRange(timeZone: string, dateKey?: string | null) {
  const normalizedDateKey = dateKey || formatDateKey(getDatePartsInTimeZone(new Date(), timeZone));
  const nextDateKey = addDaysToDateKey(normalizedDateKey, 1);

  if (!nextDateKey) {
    return null;
  }

  const from = zonedMidnightToUtc(normalizedDateKey, timeZone);
  const to = zonedMidnightToUtc(nextDateKey, timeZone);

  if (!from || !to) {
    return null;
  }

  return { dateKey: normalizedDateKey, from, to };
}

function sumCash(
  groups: Array<{ type: CashMovementType; _sum?: { amount?: unknown } | null }>,
  type: CashMovementType
) {
  return groups
    .filter((group) => group.type === type)
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
}

function effectiveAccountAmount(account: { amount: unknown; paidAmount: unknown | null }) {
  return decimalToNumber(account.paidAmount ?? account.amount);
}

function sumAccounts(
  accounts: Array<{
    type: FinancialAccountType;
    status: FinancialAccountStatus;
    amount: unknown;
    paidAmount: unknown | null;
  }>,
  type: FinancialAccountType,
  statuses: FinancialAccountStatus[],
  useEffectivePaidAmount = false
) {
  return accounts
    .filter((account) => account.type === type && statuses.includes(account.status))
    .reduce(
      (total, account) =>
        total + (useEffectivePaidAmount ? effectiveAccountAmount(account) : decimalToNumber(account.amount)),
      0
    );
}

function rowAmount(value: number | null) {
  return value === null ? "-" : formatCurrency(value);
}

export function getDailyReportPerformance(data: DailyReportData) {
  const isGood = data.cash.balance >= 0;

  return {
    status: isGood ? "bom" : "ruim",
    tone: isGood ? "good" : "bad",
    message: isGood
      ? `O dia foi bom: o caixa fechou positivo em ${formatCurrency(data.cash.balance)}.`
      : `O dia foi ruim: o caixa fechou negativo em ${formatCurrency(Math.abs(data.cash.balance))}.`,
  };
}

export async function getDailyReportData(
  params: { dateKey?: string | null; tenantId: string; timeZone?: string }
) {
  const timeZone = params.timeZone || process.env.DAILY_REPORT_TIME_ZONE || DEFAULT_TIME_ZONE;
  const range = getDailyRange(timeZone, params.dateKey);

  if (!range) {
    throw new Error("Data do relatorio diario invalida.");
  }

  const whereDate = { gte: range.from, lt: range.to };

  const [movements, movementSummary, accounts] = await prisma.$transaction([
    prisma.cashMovement.findMany({
      where: { movementDate: whereDate, tenantId: params.tenantId },
      include: {
        category: { select: { id: true, name: true } },
        sale: { select: { id: true, code: true } },
        financialAccount: { select: { id: true, code: true } },
      },
      orderBy: [{ movementDate: "desc" }, { code: "desc" }],
      take: 5000,
    }),
    prisma.cashMovement.groupBy({
      by: ["type"],
      where: { movementDate: whereDate, tenantId: params.tenantId },
      orderBy: { type: "asc" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financialAccount.findMany({
      where: { dueDate: whereDate, tenantId: params.tenantId },
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, code: true } },
        supplierOrder: { select: { id: true, code: true } },
      },
      orderBy: [{ dueDate: "desc" }, { code: "desc" }],
      take: 5000,
    }),
  ]);

  const entries = sumCash(movementSummary, "ENTRADA");
  const exits = sumCash(movementSummary, "SAIDA");
  const dateLabel = formatDate(range.from);
  const rows: DailyReportRow[] = [
    ...movements.map((movement) => ({
      id: `movement-${movement.id}`,
      kind: "Caixa",
      code: movement.code,
      description: movement.description,
      typeLabel: getCashMovementTypeLabel(movement.type),
      category: movement.category?.name ?? "-",
      date: movement.movementDate,
      paymentMethod: getPaymentMethodLabel(movement.paymentMethod),
      amount: decimalToNumber(movement.amount),
      status: getCashMovementTypeLabel(movement.type),
    })),
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      kind: "Conta",
      code: account.code,
      description: account.description,
      typeLabel: getFinancialTypeLabel(account.type),
      category: account.category ?? "-",
      date: account.dueDate,
      paymentMethod: getPaymentMethodLabel(account.paymentMethod),
      amount: decimalToNumber(account.status === "PAGA" ? account.paidAmount ?? account.amount : account.amount),
      status: getFinancialStatusLabel(account.status),
    })),
  ].sort((a, b) => {
    const dateA = a.date ? a.date.getTime() : 0;
    const dateB = b.date ? b.date.getTime() : 0;
    return dateB - dateA;
  });

  return {
    dateKey: range.dateKey,
    dateLabel,
    timeZone,
    from: range.from,
    to: range.to,
    cash: {
      entries,
      exits,
      balance: entries - exits,
      movementCount: movements.length,
    },
    accounts: {
      received: sumAccounts(accounts, "RECEBER", ["PAGA"], true),
      paid: sumAccounts(accounts, "PAGAR", ["PAGA"], true),
      openReceivable: sumAccounts(accounts, "RECEBER", ["ABERTA", "VENCIDA"]),
      openPayable: sumAccounts(accounts, "PAGAR", ["ABERTA", "VENCIDA"]),
      accountCount: accounts.length,
    },
    rows,
  };
}

export async function renderDailyReportPdf(data: DailyReportData) {
  const h = React.createElement;
  const performance = getDailyReportPerformance(data);
  const balanceStyle = performance.tone === "good" ? styles.summaryGood : styles.summaryBad;
  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.title }, "Relatorio diario"),
        h(Text, { style: styles.subtitle }, `${data.dateLabel} | Fuso: ${data.timeZone}`),
        h(Text, { style: styles.subtitle }, performance.message)
      ),
      h(
        View,
        { style: styles.summaryGrid },
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Entradas caixa"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.cash.entries))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Saidas caixa"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.cash.exits))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Saldo caixa"),
          h(Text, { style: [styles.summaryValue, balanceStyle] }, formatCurrency(data.cash.balance))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Contas do dia"),
          h(Text, { style: styles.summaryValue }, String(data.accounts.accountCount))
        )
      ),
      h(
        View,
        { style: styles.summaryGrid },
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Recebidas"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.accounts.received))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "Pagas"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.accounts.paid))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "A receber aberto"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.accounts.openReceivable))
        ),
        h(
          View,
          { style: styles.summaryCard },
          h(Text, { style: styles.summaryLabel }, "A pagar aberto"),
          h(Text, { style: styles.summaryValue }, formatCurrency(data.accounts.openPayable))
        )
      ),
      h(Text, { style: styles.sectionTitle }, "Movimentos e contas"),
      h(
        View,
        { style: styles.tableHeader },
        h(Text, { style: [styles.cell, styles.cellOrigin, styles.headerText] }, "Origem"),
        h(Text, { style: [styles.cell, styles.cellRegister, styles.headerText] }, "Registro"),
        h(Text, { style: [styles.cell, styles.cellType, styles.headerText] }, "Tipo"),
        h(Text, { style: [styles.cell, styles.cellCategory, styles.headerText] }, "Categoria"),
        h(Text, { style: [styles.cell, styles.cellDate, styles.headerText] }, "Data"),
        h(Text, { style: [styles.cell, styles.cellPayment, styles.headerText] }, "Forma"),
        h(Text, { style: [styles.cell, styles.cellAmount, styles.headerText] }, "Valor"),
        h(Text, { style: [styles.cell, styles.cellStatus, styles.headerText] }, "Status")
      ),
      data.rows.length
        ? data.rows.map((row) =>
            h(
              View,
              { key: row.id, style: styles.tableRow },
              h(Text, { style: [styles.cell, styles.cellOrigin] }, row.kind),
              h(Text, { style: [styles.cell, styles.cellRegister] }, `#${row.code} ${row.description}`),
              h(Text, { style: [styles.cell, styles.cellType] }, row.typeLabel),
              h(Text, { style: [styles.cell, styles.cellCategory] }, row.category),
              h(Text, { style: [styles.cell, styles.cellDate] }, formatDate(row.date)),
              h(Text, { style: [styles.cell, styles.cellPayment] }, row.paymentMethod),
              h(Text, { style: [styles.cell, styles.cellAmount] }, rowAmount(row.amount)),
              h(Text, { style: [styles.cell, styles.cellStatus] }, row.status)
            )
          )
        : h(Text, { style: styles.tableEmpty }, "Nenhum registro encontrado.")
    )
  );
  const pdfStream = await pdf(doc).toBuffer();
  const chunks: Uint8Array[] = [];

  for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
