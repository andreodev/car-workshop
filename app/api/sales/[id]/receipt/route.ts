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

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COMPANY_SETTINGS_KEY = "company";

const colors = {
  page: "#F5F7FA",
  surface: "#FFFFFF",
  primary: "#0F172A",
  secondary: "#64748B",
  muted: "#94A3B8",
  border: "#E2E8F0",
  softBorder: "#EEF2F7",
  accent: "#2563EB",
  accentSoft: "#EFF6FF",
  success: "#16A34A",
  successSoft: "#ECFDF5",
  dark: "#020617",
};

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: colors.page,
    color: colors.primary,
  },

  topBar: {
    backgroundColor: colors.dark,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },

  logo: {
    width: 32,
    height: 32,
    objectFit: "contain",
  },

  receiptLabel: {
    fontSize: 7,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#CBD5E1",
    marginBottom: 3,
  },

  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: 2,
  },

  companyInfo: {
    fontSize: 7.5,
    color: "#CBD5E1",
    lineHeight: 1.25,
  },

  receiptBox: {
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 10,
    backgroundColor: "#0F172A",
  },

  receiptNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: 5,
  },

  badgePaid: {
    alignSelf: "flex-start",
    backgroundColor: colors.success,
    color: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  receiptMeta: {
    fontSize: 7,
    color: "#CBD5E1",
    lineHeight: 1.35,
  },

  paymentHighlight: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
    fontWeight: 700,
  },

  totalValue: {
    fontSize: 18,
    color: colors.success,
    fontWeight: 700,
  },

  paymentPill: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 7,
    fontWeight: 700,
  },

  gridTwo: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 12,
  },

  sectionTitle: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.muted,
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
    color: colors.primary,
    fontWeight: 700,
  },

  tableWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
    overflow: "hidden",
    marginBottom: 10,
  },

  tableTitle: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.softBorder,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  tableHeaderText: {
    fontSize: 7,
    color: colors.secondary,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.softBorder,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  itemName: {
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 1,
    fontSize: 8.5,
  },

  itemSub: {
    color: colors.muted,
    fontSize: 7,
  },

  cellItem: { flex: 3 },
  cellQty: { flex: 0.7, textAlign: "right" },
  cellUnit: { flex: 1, textAlign: "right" },
  cellDiscount: { flex: 1, textAlign: "right" },
  cellTotal: {
    flex: 1,
    textAlign: "right",
    fontWeight: 700,
  },

  totalsWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },

  totalsSummary: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 12,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 7,
    marginTop: 3,
  },

  totalRowLabel: {
    color: colors.secondary,
    fontSize: 8,
  },

  totalRowValue: {
    color: colors.primary,
    fontWeight: 700,
    fontSize: 8,
  },

  totalRowFinalLabel: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 700,
  },

  totalRowFinalValue: {
    fontSize: 12,
    color: colors.success,
    fontWeight: 700,
  },

  footer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBorder,
    padding: 10,
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.3,
  },

  signatureArea: {
    marginTop: 12,
    flexDirection: "row",
    gap: 16,
  },

  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 5,
    textAlign: "center",
    fontSize: 7,
    color: colors.secondary,
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

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO_CREDITO: "Cartão crédito",
    CARTAO_DEBITO: "Cartão débito",
    BOLETO: "Boleto",
    OUTRO: "Outro",
  };

  return labels[value] ?? value;
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

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      sector: true,
      items: {
        include: {
          catalogItem: true,
        },
      },
    },
  });

  if (!sale) {
    return Response.json(
      { error: "Venda não encontrada." },
      { status: 404 }
    );
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

  const h = React.createElement;

  const doc = h(
    Document,
    null,
    h(
      Page,
      {
        size: "A4",
        style: styles.page,
      },

      h(
        View,
        { style: styles.topBar },

        h(
          View,
          { style: styles.brandArea },

          h(
            View,
            { style: styles.logoBox },
            logoSrc
              ? h(Image, {
                  src: logoSrc,
                  style: styles.logo,
                })
              : null
          ),

          h(
            View,
            { style: { flex: 1 } },

            h(Text, { style: styles.receiptLabel }, "Recibo de pagamento"),

            h(
              Text,
              { style: styles.companyName },
              companySettings?.tradeName || "Empresa"
            ),

            companySettings?.document
              ? h(
                  Text,
                  { style: styles.companyInfo },
                  `CNPJ: ${formatDocument(companySettings.document)}`
                )
              : null,

            companySettings?.phone
              ? h(
                  Text,
                  { style: styles.companyInfo },
                  formatPhone(companySettings.phone)
                )
              : null,

            companySettings?.email
              ? h(
                  Text,
                  { style: styles.companyInfo },
                  companySettings.email
                )
              : null
          )
        ),

        h(
          View,
          { style: styles.receiptBox },

          h(Text, { style: styles.receiptLabel }, "Documento"),

          h(Text, { style: styles.receiptNumber }, `#${sale.code}`),

          h(Text, { style: styles.badgePaid }, "Pago"),

          h(
            Text,
            { style: styles.receiptMeta },
            `Emissão: ${formatDateTime(sale.createdAt)}`
          ),

          h(
            Text,
            { style: styles.receiptMeta },
            `Pagamento: ${paymentLabel(sale.paymentMethod)}`
          )
        )
      ),

      h(
        View,
        { style: styles.paymentHighlight },

        h(
          View,
          null,

          h(Text, { style: styles.totalLabel }, "Valor total"),

          h(Text, { style: styles.totalValue }, formatCurrency(sale.total))
        ),

        h(
          View,
          { style: { alignItems: "flex-end" } },

          h(
            Text,
            { style: styles.paymentPill },
            paymentLabel(sale.paymentMethod)
          ),

          h(
            Text,
            {
              style: {
                marginTop: 5,
                color: colors.secondary,
                fontSize: 7,
              },
            },
            `Responsável: ${sale.responsible || "-"}`
          )
        )
      ),

      h(
        View,
        { style: styles.gridTwo },

        h(
          View,
          { style: styles.card },

          h(Text, { style: styles.sectionTitle }, "Cliente"),

          h(
            Text,
            { style: styles.infoLine },
            "Nome: ",
            h(
              Text,
              { style: styles.strong },
              sale.client?.name || "-"
            )
          ),

          sale.client?.cpf
            ? h(
                Text,
                { style: styles.infoLine },
                "Documento: ",
                h(
                  Text,
                  { style: styles.strong },
                  formatDocument(sale.client.cpf)
                )
              )
            : null,

          sale.client?.mobile
            ? h(
                Text,
                { style: styles.infoLine },
                "Telefone: ",
                h(
                  Text,
                  { style: styles.strong },
                  formatPhone(sale.client.mobile)
                )
              )
            : null,

          sale.client?.email
            ? h(
                Text,
                { style: styles.infoLine },
                "Email: ",
                h(
                  Text,
                  { style: styles.strong },
                  sale.client.email
                )
              )
            : null
        ),

        h(
          View,
          { style: styles.card },

          h(Text, { style: styles.sectionTitle }, "Venda"),

          h(
            Text,
            { style: styles.infoLine },
            "Código: ",
            h(Text, { style: styles.strong }, `#${sale.code}`)
          ),

          h(
            Text,
            { style: styles.infoLine },
            "Data: ",
            h(
              Text,
              { style: styles.strong },
              formatDateTime(sale.createdAt)
            )
          ),

          h(
            Text,
            { style: styles.infoLine },
            "Setor: ",
            h(
              Text,
              { style: styles.strong },
              sale.sector?.name || "-"
            )
          ),

          h(
            Text,
            { style: styles.infoLine },
            "Responsável: ",
            h(
              Text,
              { style: styles.strong },
              sale.responsible || "-"
            )
          )
        )
      ),

      h(
        View,
        { style: styles.tableWrapper },

        h(
          View,
          { style: styles.tableTitle },
          h(Text, { style: styles.sectionTitle }, "Itens do recibo")
        ),

        h(
          View,
          { style: styles.tableHeader },

          h(
            Text,
            { style: [styles.cellItem, styles.tableHeaderText] },
            "Item"
          ),

          h(
            Text,
            { style: [styles.cellQty, styles.tableHeaderText] },
            "Qtd."
          ),

          h(
            Text,
            { style: [styles.cellUnit, styles.tableHeaderText] },
            "Unitário"
          ),

          h(
            Text,
            { style: [styles.cellDiscount, styles.tableHeaderText] },
            "Desc."
          ),

          h(
            Text,
            { style: [styles.cellTotal, styles.tableHeaderText] },
            "Total"
          )
        ),

        ...(sale.items || []).map((item, index, arr) =>
          h(
            View,
            {
              key: item.id,
              style:
                index === arr.length - 1
                  ? styles.tableRowLast
                  : styles.tableRow,
            },

            h(
              View,
              { style: styles.cellItem },

              h(
                Text,
                { style: styles.itemName },
                item.description
              ),

              h(
                Text,
                { style: styles.itemSub },
                item.catalogItem?.name || "Item"
              )
            ),

            h(
              Text,
              { style: styles.cellQty },
              String(item.quantity)
            ),

            h(
              Text,
              { style: styles.cellUnit },
              formatCurrency(item.unitPrice)
            ),

            h(
              Text,
              { style: styles.cellDiscount },
              formatCurrency(item.discount)
            ),

            h(
              Text,
              { style: styles.cellTotal },
              formatCurrency(item.total)
            )
          )
        )
      ),

      h(
        View,
        { style: styles.totalsWrapper },

        h(
          View,
          { style: styles.totalsSummary },

          h(
            View,
            { style: styles.totalRow },

            h(Text, { style: styles.totalRowLabel }, "Subtotal"),

            h(
              Text,
              { style: styles.totalRowValue },
              formatCurrency(sale.subtotal)
            )
          ),

          h(
            View,
            { style: styles.totalRow },

            h(Text, { style: styles.totalRowLabel }, "Desconto"),

            h(
              Text,
              { style: styles.totalRowValue },
              formatCurrency(sale.discountTotal)
            )
          ),

          h(
            View,
            { style: styles.totalRowFinal },

            h(Text, { style: styles.totalRowFinalLabel }, "Total pago"),

            h(
              Text,
              { style: styles.totalRowFinalValue },
              formatCurrency(sale.total)
            )
          )
        )
      ),

      h(
        View,
        { style: styles.footer },

        h(
          Text,
          null,
          companySettings?.documentFooter ||
            "Este recibo foi emitido digitalmente e comprova os valores descritos neste documento."
        ),

        h(
          View,
          { style: styles.signatureArea },

          h(
            Text,
            { style: styles.signatureBox },
            "Assinatura do cliente"
          ),

          h(
            Text,
            { style: styles.signatureBox },
            "Assinatura do responsável"
          )
        )
      )
    )
  );

  const pdfBuffer = await pdf(doc).toBuffer();

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=recibo-${sale.code}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}