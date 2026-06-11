import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { decimalToNumber, formatCurrency, formatDate } from "@/app/lib/reports";
import {
  getCashMovementTypeLabel,
  getFinancialCategoryTypeLabel,
  getFinancialStatusLabel,
  getFinancialTypeLabel,
  getPaymentMethodLabel,
} from "@/app/(app)/financeiro/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const colors = {
  page: "#FFFFFF",
  text: "#111111",
  muted: "#4B4B4B",
  border: "#CCCCCC",
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

const statementKinds = ["TODOS", "CONTA", "CAIXA", "CATEGORIA"] as const;
const accountTypes = ["RECEBER", "PAGAR"] as const;
const accountStatuses = ["ABERTA", "PAGA", "VENCIDA", "CANCELADA"] as const;
const cashTypes = ["ENTRADA", "SAIDA"] as const;
const categoryTypes = ["RECEITA", "DESPESA", "AMBOS"] as const;

type StatementKind = (typeof statementKinds)[number];

type StatementRow = {
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
  notes: string;
};

function normalizeString(value: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeDateStart(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const date = new Date(`${normalized}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeEnum<T extends string>(
  value: string | null,
  allowed: readonly T[]
) {
  const normalized = normalizeString(value);
  if (!normalized || normalized === "TODOS") {
    return null;
  }
  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

function buildDateRangeWhere(from: Date | null, to: Date | null) {
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function buildAccountPeriodWhere(
  from: Date | null,
  to: Date | null,
  status: string | null
): Prisma.FinancialAccountWhereInput | null {
  if (!from && !to) {
    return null;
  }

  const dateRange = buildDateRangeWhere(from, to);

  if (status === "PAGA") {
    return {
      OR: [
        { paymentDate: dateRange },
        { paymentDate: null, dueDate: dateRange },
      ],
    };
  }

  if (status) {
    return { dueDate: dateRange };
  }

  return {
    OR: [
      {
        status: "PAGA",
        OR: [
          { paymentDate: dateRange },
          { paymentDate: null, dueDate: dateRange },
        ],
      },
      {
        status: { in: ["ABERTA", "VENCIDA", "CANCELADA"] },
        dueDate: dateRange,
      },
    ],
  };
}

function getAccountStatementDate(account: {
  status: string;
  dueDate: Date;
  paymentDate: Date | null;
}) {
  if (account.status === "PAGA") {
    return account.paymentDate ?? account.dueDate;
  }

  return account.dueDate;
}

function formatPeriod(from: Date | null, to: Date | null) {
  if (!from && !to) {
    return "Periodo: todos";
  }
  if (from && to) {
    return `Periodo: ${formatDate(from)} ate ${formatDate(to)}`;
  }
  if (from) {
    return `Periodo: a partir de ${formatDate(from)}`;
  }
  return `Periodo: ate ${formatDate(to)}`;
}

function rowAmount(value: number | null) {
  return value === null ? "-" : formatCurrency(value);
}

export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return new Response("Nao autorizado.", { status: 401 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const statementKind =
    (normalizeEnum(searchParams.get("statementKind"), statementKinds) as StatementKind | null) ??
    "TODOS";
  const statementSearch = normalizeString(searchParams.get("search"));
  const accountType = normalizeEnum(searchParams.get("accountType"), accountTypes);
  const accountStatus = normalizeEnum(searchParams.get("accountStatus"), accountStatuses);
  const movementType = normalizeEnum(searchParams.get("movementType"), cashTypes);
  const categoryType = normalizeEnum(searchParams.get("categoryType"), categoryTypes);
  const activeFilter = normalizeString(searchParams.get("activeFilter"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const shouldAccounts = statementKind === "TODOS" || statementKind === "CONTA";
  const shouldMovements = statementKind === "TODOS" || statementKind === "CAIXA";
  const shouldCategories = statementKind === "CATEGORIA";

  const accountWhere: Prisma.FinancialAccountWhereInput = {};
  const movementWhere: Prisma.CashMovementWhereInput = {};
  const categoryWhere: Prisma.FinancialCategoryWhereInput = {};

  if (accountType) {
    accountWhere.type = accountType;
  }

  if (accountStatus) {
    accountWhere.status = accountStatus;
  }

  const accountPeriodWhere = buildAccountPeriodWhere(from, to, accountStatus);

  if (accountPeriodWhere) {
    accountWhere.AND = [
      ...(Array.isArray(accountWhere.AND) ? accountWhere.AND : []),
      accountPeriodWhere,
    ];
  }

  if (movementType) {
    movementWhere.type = movementType;
  }

  if (from || to) {
    movementWhere.movementDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (categoryType) {
    categoryWhere.type = categoryType;
  }

  if (activeFilter === "ATIVAS") {
    categoryWhere.active = true;
  }

  if (activeFilter === "INATIVAS") {
    categoryWhere.active = false;
  }

  if (statementSearch) {
    const code = Number(statementSearch);
    const searchMode: Prisma.QueryMode = "insensitive";
    const numericCode = Number.isInteger(code) && code > 0 ? code : null;

    accountWhere.OR = [
      { description: { contains: statementSearch, mode: searchMode } },
      { counterparty: { contains: statementSearch, mode: searchMode } },
      { category: { contains: statementSearch, mode: searchMode } },
      { documentNumber: { contains: statementSearch, mode: searchMode } },
      { client: { name: { contains: statementSearch, mode: searchMode } } },
      ...(numericCode ? [{ code: numericCode }] : []),
    ];

    const movementOr: Prisma.CashMovementWhereInput[] = [
      { description: { contains: statementSearch, mode: searchMode } },
      { documentNumber: { contains: statementSearch, mode: searchMode } },
      { category: { name: { contains: statementSearch, mode: searchMode } } },
      ...(numericCode
        ? [
            { sale: { code: numericCode } },
            { financialAccount: { code: numericCode } },
            { code: numericCode },
          ]
        : []),
    ];

    movementWhere.OR = movementOr;

    categoryWhere.OR = [
      { name: { contains: statementSearch, mode: searchMode } },
      { notes: { contains: statementSearch, mode: searchMode } },
    ];
  }

  const [accounts, movements, categories] = await Promise.all([
    shouldAccounts
      ? prisma.financialAccount.findMany({
          where: accountWhere,
          include: {
            client: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
            serviceOrder: { select: { id: true, code: true } },
            supplierOrder: { select: { id: true, code: true } },
          },
          orderBy: [{ dueDate: "desc" }, { code: "desc" }],
          take: 5000,
        })
      : Promise.resolve([]),
    shouldMovements
      ? prisma.cashMovement.findMany({
          where: movementWhere,
          include: {
            category: { select: { id: true, name: true } },
            sale: { select: { id: true, code: true } },
            financialAccount: { select: { id: true, code: true } },
          },
          orderBy: [{ movementDate: "desc" }, { code: "desc" }],
          take: 5000,
        })
      : Promise.resolve([]),
    shouldCategories
      ? prisma.financialCategory.findMany({
          where: categoryWhere,
          orderBy: [{ name: "asc" }],
          take: 5000,
        })
      : Promise.resolve([]),
  ]);

  const rows: StatementRow[] = [
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      kind: "Conta",
      code: account.code,
      description: account.description,
      typeLabel: getFinancialTypeLabel(account.type),
      category: account.category ?? "-",
      date: getAccountStatementDate(account),
      paymentMethod: getPaymentMethodLabel(account.paymentMethod),
      amount: decimalToNumber(account.amount),
      status: getFinancialStatusLabel(account.status),
      notes: account.serviceOrder
        ? `OS #${account.serviceOrder.code}`
        : account.supplierOrder
          ? `Pedido #${account.supplierOrder.code}`
          : account.documentNumber || account.notes || "-",
    })),
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
      notes: movement.sale
        ? `PDV #${movement.sale.code}`
        : movement.financialAccount
          ? `Conta #${movement.financialAccount.code}`
          : movement.documentNumber || movement.notes || "-",
    })),
    ...categories.map((category) => ({
      id: `category-${category.id}`,
      kind: "Categoria",
      code: category.code,
      description: category.name,
      typeLabel: getFinancialCategoryTypeLabel(category.type),
      category: "-",
      date: null,
      paymentMethod: "-",
      amount: null,
      status: category.active ? "Ativa" : "Inativa",
      notes: category.notes ?? "-",
    })),
  ].sort((a, b) => {
    const dateA = a.date ? a.date.getTime() : 0;
    const dateB = b.date ? b.date.getTime() : 0;
    return dateB - dateA;
  });

  const h = React.createElement;

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.title }, "Extrato financeiro"),
        h(Text, { style: styles.subtitle }, formatPeriod(from, to))
      ),
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
      rows.length
        ? rows.map((row) =>
            h(
              View,
              { key: row.id, style: styles.tableRow },
              h(Text, { style: [styles.cell, styles.cellOrigin] }, row.kind),
              h(
                Text,
                { style: [styles.cell, styles.cellRegister] },
                `#${row.code} ${row.description}`
              ),
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

  const pdfBuffer = Buffer.concat(chunks);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=extrato-financeiro-${stamp}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
