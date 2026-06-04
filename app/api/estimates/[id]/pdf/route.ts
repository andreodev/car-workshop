import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import {
  pdf,
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { estimateService } from "../../services/estimate.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const colors = {
  page: "#FFFFFF",
  primary: "#000000",
  secondary: "#333333",
  muted: "#555555",
  border: "#000000",
  softBorder: "#999999",
};

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: colors.page,
    color: colors.primary,
  },

  topBar: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  brandArea: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },

  logoBox: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },

  logo: {
    width: 62,
    height: 62,
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
    color: colors.primary,
    marginBottom: 2,
  },

  companyInfo: {
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.25,
  },

  docBox: {
    width: 150,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },

  docNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 5,
  },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.primary,
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
    color: colors.primary,
    fontWeight: 700,
  },

  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.primary,
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
    color: colors.primary,
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

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  tableHeaderText: {
    fontSize: 7,
    color: colors.primary,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.softBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  itemName: {
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 1,
    fontSize: 8.5,
  },

  itemSub: {
    color: colors.secondary,
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
    marginBottom: 8,
  },

  totalsSummary: {
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
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
    color: colors.primary,
    fontWeight: 700,
  },

  legalBox: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
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

function formatDate(value: Date | string | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
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
    .join(" • ");

  const line3 = settings.cep ? `CEP ${settings.cep}` : "";

  return [line1, line2, line3].filter(Boolean).join(" | ");
}

function safeText(value: string | null | undefined) {
  const text = value?.trim();

  return text && text.length > 0 ? text : "-";
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

  const result = await estimateService.findPdfDataById(id);

  if ("error" in result) {
    return Response.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { estimate, companySettings } = result.data;

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

  const phone =
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

  const vehicleDescription =
    [
      estimate.vehicle?.plate,
      estimate.vehicle?.brand,
      estimate.vehicle?.model,
      estimate.vehicle?.version,
    ]
      .filter(Boolean)
      .join(" - ") || "-";

  const mechanicName = safeText(estimate.mechanic?.name);
  const sectorName = safeText(estimate.items?.find((item) => item.sector?.name)?.sector?.name);
  const responsibleName = safeText(estimate.responsible);

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
            h(
              Text,
              { style: styles.labelLight },
              "Orçamento / proposta comercial"
            ),
            h(Text, { style: styles.companyName }, companyName),
            companyDocument
              ? h(
                  Text,
                  { style: styles.companyInfo },
                  `CNPJ/CPF: ${companyDocument}`
                )
              : null,
            companySettings?.stateRegistration
              ? h(
                  Text,
                  { style: styles.companyInfo },
                  `Inscrição Estadual: ${companySettings.stateRegistration}`
                )
              : null,
            address ? h(Text, { style: styles.companyInfo }, address) : null,
            phone
              ? h(Text, { style: styles.companyInfo }, `Contato: ${phone}`)
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
          h(Text, { style: styles.docNumber }, `#${estimate.code}`),
          h(Text, { style: styles.badge }, "Orçamento"),
          h(
            Text,
            { style: styles.docMeta },
            `Emissão: ${formatDate(estimate.createdAt)}`
          ),
          h(
            Text,
            { style: styles.docMeta },
            `Validade: ${formatDate(estimate.validUntil)}`
          )
        )
      ),

      h(
        View,
        { style: styles.highlight },
        h(
          View,
          null,
          h(Text, { style: styles.totalLabel }, "Valor total estimado"),
          h(Text, { style: styles.totalValue }, formatCurrency(estimate.total))
        ),
        h(
          View,
          { style: { alignItems: "flex-end" } },
          h(Text, { style: styles.pill }, "Proposta sem valor fiscal")
        )
      ),

      h(
        View,
        { style: styles.gridTwo },

        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.sectionTitle }, "Dados do cliente"),
          h(
            Text,
            { style: styles.infoLine },
            "Cliente: ",
            h(Text, { style: styles.strong }, estimate.client?.name ?? "-")
          )
        ),

        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.sectionTitle }, "Dados do veículo"),
          h(
            Text,
            { style: styles.infoLine },
            "Veículo: ",
            h(Text, { style: styles.strong }, vehicleDescription)
          )
        )
      ),

      h(
        View,
        { style: styles.gridThree },

        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.sectionTitle }, "Mecânico"),
          h(Text, { style: styles.strong }, mechanicName)
        ),

        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.sectionTitle }, "Setor"),
          h(Text, { style: styles.strong }, sectorName)
        ),

        h(
          View,
          { style: styles.card },
          h(Text, { style: styles.sectionTitle }, "Responsável"),
          h(Text, { style: styles.strong }, responsibleName)
        )
      ),

      h(
        View,
        { style: styles.tableWrapper },

        h(
          View,
          { style: styles.tableTitle },
          h(Text, { style: styles.sectionTitle }, "Itens e serviços orçados")
        ),

        h(
          View,
          { style: styles.tableHeader },
          h(
            Text,
            { style: [styles.cellItem, styles.tableHeaderText] },
            "Descrição"
          ),
          h(Text, { style: [styles.cellQty, styles.tableHeaderText] }, "Qtd."),
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

        items.length === 0
          ? h(
              View,
              { style: styles.tableRowLast },
              h(
                Text,
                { style: [styles.cellItem, { color: colors.muted }] },
                "Nenhum item informado."
              )
            )
          : items.map((item, index) =>
              h(
                View,
                {
                  key: item.id,
                  style:
                    index === items.length - 1
                      ? styles.tableRowLast
                      : styles.tableRow,
                },
                h(
                  View,
                  { style: styles.cellItem },
                  h(Text, { style: styles.itemName }, item.description),
                  h(
                    Text,
                    { style: styles.itemSub },
                    item.catalogItem?.name ?? "Item sem catálogo cadastrado"
                  )
                ),
                h(Text, { style: styles.cellQty }, String(item.quantity)),
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
                h(Text, { style: styles.cellTotal }, formatCurrency(item.total))
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
              formatCurrency(estimate.subtotal)
            )
          ),

          h(
            View,
            { style: styles.totalRow },
            h(Text, { style: styles.totalRowLabel }, "Desconto"),
            h(
              Text,
              { style: styles.totalRowValue },
              formatCurrency(estimate.discountTotal)
            )
          ),

          h(
            View,
            { style: styles.totalRowFinal },
            h(Text, { style: styles.totalRowFinalLabel }, "Total estimado"),
            h(
              Text,
              { style: styles.totalRowFinalValue },
              formatCurrency(estimate.total)
            )
          )
        )
      ),

      estimate.notesClient || estimate.notesInternal
        ? h(
            View,
            { style: styles.gridTwo },
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.sectionTitle }, "Observações ao cliente"),
              h(Text, { style: styles.infoLine }, estimate.notesClient || "-")
            ),
            h(
              View,
              { style: styles.card },
              h(Text, { style: styles.sectionTitle }, "Observações internas"),
              h(Text, { style: styles.infoLine }, estimate.notesInternal || "-")
            )
          )
        : null,

      h(
        View,
        { style: styles.legalBox },
        h(Text, { style: styles.sectionTitle }, "Condições gerais"),
        h(
          Text,
          null,
          "Este documento é uma proposta/orçamento comercial para fins de análise e aprovação do cliente, não substitui nota fiscal, recibo fiscal ou documento fiscal equivalente. Os valores apresentados podem sofrer alteração caso sejam identificados novos serviços, peças adicionais, variação de preço de fornecedores ou divergências após avaliação técnica. Nenhum serviço adicional deverá ser executado sem autorização prévia do cliente. A emissão de documento fiscal, quando aplicável, deverá seguir a legislação brasileira vigente."
        ),

        h(
          View,
          { style: styles.signatureArea },
          h(Text, { style: styles.signatureBox }, "Assinatura do cliente"),
          h(Text, { style: styles.signatureBox }, "Assinatura do responsável")
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

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=orcamento-${estimate.code}.pdf`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
