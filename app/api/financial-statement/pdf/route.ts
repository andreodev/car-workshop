import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
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

const COMPANY_SETTINGS_KEY = "company";

const colors = {
  page: "#FFFFFF",
  text: "#111111",
  secondary: "#333333",
  muted: "#555555",
  border: "#000000",
  softBorder: "#999999",
};

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: colors.text,
    backgroundColor: colors.page,
  },
  topBar: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandArea: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  labelLight: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.secondary,
    marginBottom: 4,
    fontWeight: 700,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.25,
  },
  docBox: {
    width: 170,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
  },
  docNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 5,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  docMeta: {
    fontSize: 7,
    color: colors.secondary,
    lineHeight: 1.35,
  },
  highlight: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.secondary,
    marginBottom: 4,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 700,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  gridTwo: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  gridThree: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.secondary,
    marginBottom: 7,
    fontWeight: 700,
  },
  infoLine: {
    marginBottom: 3,
    color: colors.secondary,
    lineHeight: 1.25,
    fontSize: 8,
  },
  strong: {
    color: colors.text,
    fontWeight: 700,
    fontSize: 8.5,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  tableTitle: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableTitleText: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.secondary,
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.softBorder,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    color: colors.text,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  detailBox: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
  },
  footer: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.3,
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

type AddressParts = {
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
};

function normalizeString(value: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeDateStart(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string | null) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const date = new Date(`${normalized}T23:59:59.999Z`);
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

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function onlyDigits(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function formatDocument(value: string | null | undefined) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return value || "";
}

function formatPhone(value: string | null | undefined) {
  const digits = onlyDigits(value);

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  return value || "";
}

function buildAddress(parts: AddressParts) {
  const street = [parts.address, parts.number].filter(Boolean).join(", ");
  const cityState = [parts.city, parts.state].filter(Boolean).join(" - ");

  return [street, parts.neighborhood, cityState, parts.cep]
    .filter(Boolean)
    .join(" | ");
}

function fileSafe(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
  const accountId = normalizeString(searchParams.get("accountId"));
  const movementId = normalizeString(searchParams.get("movementId"));
  const from = normalizeDateStart(searchParams.get("from"));
  const to = normalizeDateEnd(searchParams.get("to"));

  const shouldAccounts =
    Boolean(accountId) || (!movementId && (statementKind === "TODOS" || statementKind === "CONTA"));
  const shouldMovements =
    Boolean(movementId) || (!accountId && (statementKind === "TODOS" || statementKind === "CAIXA"));
  const shouldCategories = !accountId && !movementId && statementKind === "CATEGORIA";

  const accountWhere: Prisma.FinancialAccountWhereInput = {};
  const movementWhere: Prisma.CashMovementWhereInput = {};
  const categoryWhere: Prisma.FinancialCategoryWhereInput = {};

  if (accountType) {
    accountWhere.type = accountType;
  }

  if (accountId) {
    accountWhere.id = accountId;
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

  if (movementId) {
    movementWhere.id = movementId;
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

  const [accounts, movements, categories, companySettings] = await Promise.all([
    shouldAccounts
      ? prisma.financialAccount.findMany({
          where: accountWhere,
          include: {
            client: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
            serviceOrder: { select: { id: true, code: true } },
            supplierOrder: { select: { id: true, code: true } },
          },
          orderBy: [
            { paymentDate: "desc" },
            { dueDate: "desc" },
            { updatedAt: "desc" },
            { createdAt: "desc" },
          ],
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
          orderBy: [
            { movementDate: "desc" },
            { updatedAt: "desc" },
            { createdAt: "desc" },
          ],
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
    prisma.companySettings.findUnique({
      where: { singletonKey: COMPANY_SETTINGS_KEY },
    }),
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

  const individualRow = rows.length === 1 ? rows[0] : null;
  const isIndividualStatement = Boolean(accountId || movementId);
  const title = isIndividualStatement ? "Extrato financeiro do registro" : "Extrato financeiro";
  const subtitle = isIndividualStatement
    ? individualRow
      ? `${individualRow.kind} #${individualRow.code} - ${individualRow.description}`
      : "Registro individual nao encontrado"
    : formatPeriod(from, to);

  let logoSrc: string | null = companySettings?.logoUrl ?? null;

  if (!logoSrc) {
    try {
      const logoPath = path.join(process.cwd(), "assets", "logo", "logo.png");
      const logoBuffer = await readFile(logoPath);
      logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      logoSrc = null;
    }
  }

  const companyName =
    companySettings?.tradeName || companySettings?.legalName || "Empresa";
  const companyDocument = formatDocument(companySettings?.document);
  const companyPhone =
    formatPhone(companySettings?.phone) || formatPhone(companySettings?.whatsapp);
  const companyAddress = companySettings
    ? buildAddress({
        address: companySettings.address,
        number: companySettings.number,
        neighborhood: companySettings.neighborhood,
        city: companySettings.city,
        state: companySettings.state,
        cep: companySettings.cep,
      })
    : "";
  const selectedAccount = accountId ? accounts[0] : null;
  const selectedMovement = movementId ? movements[0] : null;
  const statementAmount = individualRow?.amount ?? null;
  const statementDirection =
    selectedMovement?.type === "SAIDA" || selectedAccount?.type === "PAGAR"
      ? "Saída"
      : selectedMovement?.type === "ENTRADA" || selectedAccount?.type === "RECEBER"
        ? "Entrada"
        : "Movimentação";
  const footerText =
    companySettings?.documentFooter ||
    "Este extrato foi emitido digitalmente para controle financeiro dos registros descritos neste documento.";

  const h = React.createElement;
  const header = h(
    View,
    { style: styles.topBar },
    h(
      View,
      { style: styles.brandArea },
      h(
        View,
        { style: styles.logoBox },
        logoSrc ? h(Image, { src: logoSrc, style: styles.logo }) : null
      ),
      h(
        View,
        { style: { flex: 1 } },
        h(Text, { style: styles.labelLight }, "Extrato financeiro"),
        h(Text, { style: styles.companyName }, companyName),
        companyDocument
          ? h(Text, { style: styles.companyInfo }, `CNPJ/CPF: ${companyDocument}`)
          : null,
        companySettings?.stateRegistration
          ? h(
              Text,
              { style: styles.companyInfo },
              `Inscrição Estadual: ${companySettings.stateRegistration}`
            )
          : null,
        companyAddress ? h(Text, { style: styles.companyInfo }, companyAddress) : null,
        companyPhone ? h(Text, { style: styles.companyInfo }, `Contato: ${companyPhone}`) : null,
        companySettings?.email
          ? h(Text, { style: styles.companyInfo }, companySettings.email)
          : null
      )
    ),
    h(
      View,
      { style: styles.docBox },
      h(Text, { style: styles.labelLight }, "Documento"),
      h(
        Text,
        { style: styles.docNumber },
        individualRow ? `#${individualRow.code}` : "Extrato"
      ),
      h(Text, { style: styles.badge }, isIndividualStatement ? statementDirection : "Periodo"),
      h(Text, { style: styles.docMeta }, `Emissão: ${formatDateTime(new Date())}`),
      h(Text, { style: styles.docMeta }, subtitle)
    )
  );

  const table = h(
    View,
    { style: styles.tableWrapper },
    h(
      View,
      { style: styles.tableTitle },
      h(Text, { style: styles.tableTitleText }, isIndividualStatement ? "Registro" : "Registros")
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
      ? rows.map((row, index) =>
          h(
            View,
            {
              key: row.id,
              style: index === rows.length - 1 ? styles.tableRowLast : styles.tableRow,
            },
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
  );

  const individualDetails =
    individualRow && isIndividualStatement
      ? [
          h(
            View,
            { key: "highlight", style: styles.highlight },
            h(
              View,
              null,
              h(Text, { style: styles.totalLabel }, "Valor do lançamento"),
              h(Text, { style: styles.totalValue }, rowAmount(statementAmount))
            ),
            h(
              View,
              { style: { alignItems: "flex-end" } },
              h(Text, { style: styles.pill }, statementDirection)
            )
          ),
          h(
            View,
            { key: "main-details", style: styles.gridThree },
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.sectionTitle }, "Identificação"),
              h(Text, { style: styles.infoLine }, "Origem: ", h(Text, { style: styles.strong }, individualRow.kind)),
              h(Text, { style: styles.infoLine }, "Registro: ", h(Text, { style: styles.strong }, `#${individualRow.code}`)),
              h(Text, { style: styles.infoLine }, "Descrição: ", h(Text, { style: styles.strong }, individualRow.description))
            ),
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.sectionTitle }, "Classificação"),
              h(Text, { style: styles.infoLine }, "Tipo: ", h(Text, { style: styles.strong }, individualRow.typeLabel)),
              h(Text, { style: styles.infoLine }, "Categoria: ", h(Text, { style: styles.strong }, individualRow.category)),
              h(Text, { style: styles.infoLine }, "Status: ", h(Text, { style: styles.strong }, individualRow.status))
            ),
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.sectionTitle }, "Pagamento"),
              h(Text, { style: styles.infoLine }, "Data: ", h(Text, { style: styles.strong }, formatDate(individualRow.date))),
              h(Text, { style: styles.infoLine }, "Forma: ", h(Text, { style: styles.strong }, individualRow.paymentMethod)),
              h(Text, { style: styles.infoLine }, "Referência: ", h(Text, { style: styles.strong }, individualRow.notes))
            )
          ),
          h(
            View,
            { key: "notes", style: styles.detailBox },
            h(Text, { style: styles.sectionTitle }, "Observações"),
            h(
              Text,
              { style: styles.infoLine },
              safeText(selectedAccount?.notes ?? selectedMovement?.notes ?? individualRow.notes)
            )
          ),
        ]
      : [table];

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", orientation: isIndividualStatement ? "portrait" : "landscape", style: styles.page },
      header,
      h(
        View,
        { style: styles.detailBox },
        h(Text, { style: styles.sectionTitle }, title),
        h(Text, { style: styles.infoLine }, subtitle)
      ),
      ...individualDetails,
      h(View, { style: styles.footer }, h(Text, null, footerText))
    )
  );

  const pdfStream = await pdf(doc).toBuffer();

  const chunks: Uint8Array[] = [];

  for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  const pdfBuffer = Buffer.concat(chunks);
  const stamp = new Date().toISOString().slice(0, 10);
  const filenameSuffix = individualRow
    ? `${individualRow.kind}-${individualRow.code}-${stamp}`
    : stamp;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=extrato-financeiro-${fileSafe(filenameSuffix)}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
