import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { pdf, Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COMPANY_SETTINGS_KEY = "company";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#101418",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 46,
    height: 46,
    objectFit: "contain",
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#64748B",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 2,
  },
  muted: {
    color: "#64748B",
  },
  docBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    minWidth: 170,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  gridThree: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    flex: 1,
  },
  cardLabel: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cellItem: { flex: 3 },
  cellQty: { flex: 1, textAlign: "right" },
  cellUnit: { flex: 1.2, textAlign: "right" },
  cellDiscount: { flex: 1.2, textAlign: "right" },
  cellTotal: { flex: 1.2, textAlign: "right", fontWeight: 700 },
  totalsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  footer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    color: "#64748B",
    fontSize: 9,
  },
});

function formatCurrency(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatDocument(value: string | null) {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) {
    return value;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string | null) {
  if (!value) {
    return null;
  }
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
  const line2 = [settings.neighborhood, settings.city, settings.state].filter(Boolean).join(" • ");
  const line3 = settings.cep ? `CEP ${settings.cep}` : "";
  return [line1, line2, line3].filter(Boolean).join(" | ");
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      items: { include: { catalogItem: { select: { id: true, name: true } } } },
      client: { select: { id: true, name: true } },
      vehicle: {
        select: {
          plate: true,
          brand: true,
          model: true,
          version: true,
        },
      },
      mechanic: { select: { name: true } },
      sector: { select: { name: true } },
    },
  });

  if (!estimate) {
    return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

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

  const companyName = companySettings?.tradeName || companySettings?.legalName || "Empresa";
  const legalName = companySettings?.legalName ? `Razao social: ${companySettings.legalName}` : null;
  const document = formatDocument(companySettings?.document ?? null);
  const phone = formatPhone(companySettings?.phone ?? null) ?? formatPhone(companySettings?.whatsapp ?? null);
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

  const items = estimate.items ?? [];

  const h = React.createElement;
  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(
        View,
        { style: styles.header },
        h(
          View,
          { style: styles.brand },
          logoSrc ? h(Image, { src: logoSrc, style: styles.logo }) : null,
          h(
            View,
            null,
            h(Text, { style: styles.sectionTitle }, "Orcamento"),
            h(Text, { style: styles.companyName }, companyName),
            legalName ? h(Text, { style: styles.muted }, legalName) : null,
            address ? h(Text, { style: styles.muted }, address) : null,
            h(
              View,
              { style: { flexDirection: "row", gap: 10, marginTop: 2, flexWrap: "wrap" } },
              phone ? h(Text, { style: styles.muted }, phone) : null,
              companySettings?.email
                ? h(Text, { style: styles.muted }, companySettings.email)
                : null,
              companySettings?.website
                ? h(Text, { style: styles.muted }, companySettings.website)
                : null
            )
          )
        ),
        h(
          View,
          { style: styles.docBox },
          h(Text, { style: styles.sectionTitle }, "Documento"),
          h(Text, { style: { fontSize: 12, fontWeight: 700 } }, `Orcamento #${estimate.code}`),
          h(
            View,
            { style: { marginTop: 6 } },
            h(Text, { style: styles.muted }, `Emissao: ${formatDate(estimate.createdAt)}`),
            h(Text, { style: styles.muted }, `Validade: ${formatDate(estimate.validUntil)}`),
            document ? h(Text, { style: styles.muted }, `CNPJ: ${document}`) : null,
            companySettings?.stateRegistration
              ? h(Text, { style: styles.muted }, `IE: ${companySettings.stateRegistration}`)
              : null
          )
        )
      ),
      h(
        View,
        { style: { marginBottom: 14 } },
        h(
          Text,
          { style: styles.muted },
          "Cliente: ",
          h(
            Text,
            { style: { color: "#101418", fontWeight: 600 } },
            estimate.client?.name ?? "-"
          )
        ),
        h(
          Text,
          { style: styles.muted },
          "Veiculo: ",
          h(
            Text,
            { style: { color: "#101418", fontWeight: 600 } },
            [
              estimate.vehicle?.plate,
              estimate.vehicle?.brand,
              estimate.vehicle?.model,
              estimate.vehicle?.version,
            ]
              .filter(Boolean)
              .join(" - ") || "-"
          )
        )
      ),
      h(
        View,
        { style: styles.gridThree },
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Mecanico"),
          h(Text, null, estimate.mechanic?.name ?? "-")
        ),
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Setor"),
          h(Text, null, estimate.sector?.name ?? "-")
        ),
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Responsavel"),
          h(Text, null, estimate.responsible)
        )
      ),
      h(
        View,
        null,
        h(
          View,
          { style: styles.tableHeader },
          h(Text, { style: styles.cellItem }, "Item"),
          h(Text, { style: styles.cellQty }, "Qtd."),
          h(Text, { style: styles.cellUnit }, "Unitario"),
          h(Text, { style: styles.cellDiscount }, "Desconto"),
          h(Text, { style: styles.cellTotal }, "Total")
        ),
        items.length === 0
          ? h(
              View,
              { style: styles.tableRow },
              h(Text, { style: [styles.cellItem, styles.muted] }, "Nenhum item informado.")
            )
          : items.map((item) =>
              h(
                View,
                { key: item.id, style: styles.tableRow },
                h(
                  View,
                  { style: styles.cellItem },
                  h(Text, { style: { fontWeight: 600 } }, item.description),
                  h(Text, { style: styles.muted }, item.catalogItem?.name ?? "Item sem catalogo")
                ),
                h(Text, { style: styles.cellQty }, String(item.quantity)),
                h(Text, { style: styles.cellUnit }, formatCurrency(item.unitPrice)),
                h(Text, { style: styles.cellDiscount }, formatCurrency(item.discount)),
                h(Text, { style: styles.cellTotal }, formatCurrency(item.total))
              )
            )
      ),
      h(
        View,
        { style: styles.totalsRow },
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Subtotal"),
          h(Text, { style: { fontWeight: 700 } }, formatCurrency(estimate.subtotal))
        ),
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Desconto"),
          h(Text, { style: { fontWeight: 700 } }, formatCurrency(estimate.discountTotal))
        ),
        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.cardLabel }, "Total"),
          h(Text, { style: { fontWeight: 700, color: "#DC2626" } }, formatCurrency(estimate.total))
        )
      ),
      estimate.notesClient || estimate.notesInternal
        ? h(
            View,
            { style: { flexDirection: "row", gap: 12, marginTop: 16 } },
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.cardLabel }, "Observacoes para o cliente"),
              h(Text, null, estimate.notesClient || "-")
            ),
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.cardLabel }, "Observacoes internas"),
              h(Text, null, estimate.notesInternal || "-")
            )
          )
        : null,
      companySettings?.commercialNotes || companySettings?.documentFooter
        ? h(
            View,
            { style: styles.footer },
            companySettings?.commercialNotes
              ? h(Text, null, companySettings.commercialNotes)
              : null,
            companySettings?.documentFooter
              ? h(Text, { style: { marginTop: 6 } }, companySettings.documentFooter)
              : null
          )
        : null
    )
  );

  const pdfBlob = await pdf(doc).toBlob();
  const pdfBuffer = await pdfBlob.arrayBuffer();

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=orcamento-${estimate.code}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
