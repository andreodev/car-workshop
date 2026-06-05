import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { formatCurrency, formatDate } from "@/app/lib/reports";
import { getMechanicCommissionReport } from "../shared";

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
  summary: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.softBorder,
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
    color: colors.text,
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
  signatureArea: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    gap: 18,
  },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 5,
    textAlign: "center",
    fontSize: 7.5,
    color: colors.secondary,
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

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPeriod(from: Date, to: Date) {
  return `${formatDate(from)} até ${formatDate(to)}`;
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

function formatDateTime(value: Date) {
  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDocument(value: string | null) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
      6,
      9
    )}-${digits.slice(9)}`;
  }

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8
    )}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  return value;
}

function formatPhone(value: string | null) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return value;
}

function buildAddress(settings: {
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}) {
  const line1 = [settings.address, settings.number].filter(Boolean).join(", ");
  const line2 = [settings.neighborhood, settings.city, settings.state]
    .filter(Boolean)
    .join(" - ");
  const line3 = settings.cep ? `CEP ${settings.cep}` : "";

  return [line1, line2, line3].filter(Boolean).join(" | ");
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
  const companySettings = await prisma.companySettings.findUnique({
    where: { singletonKey: COMPANY_SETTINGS_KEY },
  });

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
  const companyDocument = formatDocument(companySettings?.document ?? null);
  const companyPhone =
    formatPhone(companySettings?.phone ?? null) ??
    formatPhone(companySettings?.whatsapp ?? null);
  const address = companySettings
    ? buildAddress({
        address: companySettings.address,
        number: companySettings.number,
        neighborhood: companySettings.neighborhood,
        city: companySettings.city,
        state: companySettings.state,
        cep: companySettings.cep,
      })
    : "";
  const mechanicSignatureLabel =
    report.groups.length === 1
      ? `Assinatura do mecânico - ${report.groups[0].mechanicName}`
      : "Assinatura do mecânico";
  const h = React.createElement;

  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      h(
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
            h(Text, { style: styles.labelLight }, "Comprovante de comissão"),
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
            address ? h(Text, { style: styles.companyInfo }, address) : null,
            companyPhone
              ? h(Text, { style: styles.companyInfo }, `Contato: ${companyPhone}`)
              : null,
            companySettings?.email
              ? h(Text, { style: styles.companyInfo }, companySettings.email)
              : null
          )
        ),
        h(
          View,
          { style: styles.docBox },
          h(Text, { style: styles.labelLight }, "Documento"),
          h(Text, { style: styles.docNumber }, `Comissões ${report.periodLabel}`),
          h(Text, { style: styles.badge }, "A pagar"),
          h(Text, { style: styles.docMeta }, `Emissão: ${formatDateTime(new Date())}`),
          h(Text, { style: styles.docMeta }, `Período: ${formatPeriod(report.from, report.to)}`)
        )
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
          h(Text, { style: styles.summaryLabel }, "Mecânicos"),
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
                h(Text, { style: [styles.cell, styles.amountCell, styles.headerText] }, "Comissão")
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
        : h(Text, { style: styles.detail }, "Nenhuma comissão encontrada neste período."),
      h(
        View,
        { style: styles.signatureArea },
        h(Text, { style: styles.signatureBox }, mechanicSignatureLabel),
        h(Text, { style: styles.signatureBox }, "Assinatura do responsável pelo pagamento")
      ),
      h(
        View,
        { style: styles.footer },
        h(
          Text,
          null,
          companySettings?.documentFooter ||
            "Este comprovante foi emitido digitalmente para controle de pagamento das comissões descritas neste documento."
        )
      )
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
