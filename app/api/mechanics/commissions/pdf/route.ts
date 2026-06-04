import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { formatCurrency, formatDate } from "@/app/lib/reports";
import { getMechanicCommissionReport } from "../shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const colors = {
  text: "#111111",
  muted: "#555555",
  border: "#D4D4D4",
  accent: "#B91C1C",
  soft: "#F8FAFC",
};

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: colors.text,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.muted,
  },
  summary: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
    padding: 8,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 7,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent,
  },
  mechanicBlock: {
    marginBottom: 12,
  },
  mechanicTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 5,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  cell: {
    paddingRight: 5,
  },
  headerText: {
    color: colors.muted,
    fontSize: 7,
    textTransform: "uppercase",
  },
  osCell: {
    width: 58,
  },
  vehicleCell: {
    width: 94,
  },
  clientCell: {
    flex: 1,
  },
  dueDateCell: {
    width: 58,
  },
  baseCell: {
    width: 70,
    textAlign: "right",
  },
  percentCell: {
    width: 48,
    textAlign: "right",
  },
  amountCell: {
    width: 74,
    textAlign: "right",
  },
  detail: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 7,
  },
});

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPeriod(from: Date, to: Date) {
  return `${formatDate(from)} ate ${formatDate(to)}`;
}

function formatPercent(value: string | null) {
  if (!value) return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}%`;
}

function vehicleLabel(account: {
  serviceOrder: { vehicle: { plate: string; brand: string | null; model: string | null } | null } | null;
}) {
  const vehicle = account.serviceOrder?.vehicle;

  if (!vehicle) {
    return "-";
  }

  return [vehicle.plate, vehicle.brand, vehicle.model].filter(Boolean).join(" - ");
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return new Response("Nao autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const report = await getMechanicCommissionReport({
    period: searchParams.get("period"),
    mechanicName: searchParams.get("mechanicName"),
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
        h(Text, { style: styles.title }, "Comissoes de mecanicos a pagar"),
        h(Text, { style: styles.subtitle }, `${report.periodLabel} - ${formatPeriod(report.from, report.to)}`)
      ),
      h(
        View,
        { style: styles.summary },
        h(
          View,
          { style: styles.summaryBox },
          h(Text, { style: styles.summaryLabel }, "Total a pagar"),
          h(Text, { style: styles.summaryValue }, formatCurrency(report.summary.total))
        ),
        h(
          View,
          { style: styles.summaryBox },
          h(Text, { style: styles.summaryLabel }, "Mecanicos"),
          h(Text, { style: styles.summaryValue }, String(report.summary.mechanicsCount))
        ),
        h(
          View,
          { style: styles.summaryBox },
          h(Text, { style: styles.summaryLabel }, "Contas"),
          h(Text, { style: styles.summaryValue }, String(report.summary.accountsCount))
        )
      ),
      report.groups.length
        ? report.groups.map((group) =>
            h(
              View,
              { key: group.mechanicName, style: styles.mechanicBlock },
              h(
                Text,
                { style: styles.mechanicTitle },
                `${group.mechanicName} - ${formatCurrency(group.total)}`
              ),
              h(
                View,
                { style: styles.tableHeader },
                h(Text, { style: [styles.cell, styles.osCell, styles.headerText] }, "OS"),
                h(Text, { style: [styles.cell, styles.vehicleCell, styles.headerText] }, "Placa"),
                h(Text, { style: [styles.cell, styles.clientCell, styles.headerText] }, "Origem"),
                h(Text, { style: [styles.cell, styles.dueDateCell, styles.headerText] }, "Venc."),
                h(Text, { style: [styles.cell, styles.baseCell, styles.headerText] }, "Base"),
                h(Text, { style: [styles.cell, styles.percentCell, styles.headerText] }, "%"),
                h(Text, { style: [styles.cell, styles.amountCell, styles.headerText] }, "Comissao")
              ),
              ...group.accounts.map((account) =>
                h(
                  View,
                  { key: String(account.id), style: styles.tableRow },
                  h(
                    Text,
                    { style: [styles.cell, styles.osCell] },
                    account.serviceOrder ? `#${account.serviceOrder.code}` : account.documentNumber ?? "-"
                  ),
                  h(Text, { style: [styles.cell, styles.vehicleCell] }, vehicleLabel(account)),
                  h(
                    Text,
                    { style: [styles.cell, styles.clientCell] },
                    `${account.serviceOrder?.client?.name ?? "-"}\n${account.sourceItems
                      .map((item) => item.description)
                      .join(", ") || account.notes || account.description}`
                  ),
                  h(Text, { style: [styles.cell, styles.dueDateCell] }, formatDate(new Date(account.dueDate))),
                  h(Text, { style: [styles.cell, styles.baseCell] }, formatCurrency(account.commissionBase)),
                  h(Text, { style: [styles.cell, styles.percentCell] }, formatPercent(account.commissionPercent)),
                  h(Text, { style: [styles.cell, styles.amountCell] }, formatCurrency(toNumber(account.amount)))
                )
              )
            )
          )
        : h(Text, { style: styles.detail }, "Nenhuma comissao encontrada neste periodo.")
    )
  );

  const pdfStream = await pdf(doc).toBuffer();
  const chunks: Uint8Array[] = [];

  for await (const chunk of pdfStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  const pdfBuffer = Buffer.concat(chunks);
  const stamp = new Date().toISOString().slice(0, 10);
  const mechanicName = searchParams.get("mechanicName");
  const fileSlug = mechanicName
    ? mechanicName.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
    : "todos";

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=comissoes-${fileSlug}-${report.period}-${stamp}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
