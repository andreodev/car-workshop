import type { SalePaymentMethod } from "@prisma/client";

import { renderSaleReceiptPdf } from "@/app/api/sales/[id]/receipt/receipt-pdf";
import { prisma } from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/reports";
import { getPaymentMethodLabel } from "@/app/(app)/financeiro/status";
import { emailService, escapeEmailHtml } from "@/modules/email";

const MAX_EMAIL_ITEMS = 8;

type PdvSaleEmailEvent = "CREATED" | "CANCELED";

type PdvSaleEmailData = {
  id: string;
  tenantId: string | null;
  code: number;
  createdAt: Date;
  total: unknown;
  sectorName: string | null;
  responsible: string | null;
  client: { name: string | null; mobile?: string | null; phone1?: string | null } | null;
  sector: { name: string | null } | null;
  serviceOrder: { code: number; vehicle: { plate: string | null; model: string | null } | null } | null;
  payments: Array<{
    paymentMethod: SalePaymentMethod;
    amount: unknown;
    feeAmount?: unknown;
    installments?: number | null;
  }>;
  items: Array<{
    description: string;
    quantity: unknown;
    total: unknown;
  }>;
};

function formatDateTime(value: Date) {
  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentSummary(
  payments: Array<{
    paymentMethod: SalePaymentMethod;
    amount: unknown;
    feeAmount?: unknown;
    installments?: number | null;
  }>
) {
  if (payments.length === 0) {
    return "-";
  }

  return payments
    .map((payment) => {
      const installments =
        payment.paymentMethod === "CARTAO_CREDITO" && payment.installments
          ? ` ${payment.installments}x`
          : "";
      const fee = Number(payment.feeAmount ?? 0);
      const feeText = fee > 0 ? `, taxa ${formatCurrency(fee)}` : "";

      return `${getPaymentMethodLabel(payment.paymentMethod)}${installments}: ${formatCurrency(payment.amount)}${feeText}`;
    })
    .join("\n");
}

function htmlList(items: string[]) {
  return items.map((item) => `<li>${escapeEmailHtml(item)}</li>`).join("");
}

function saleOrigin(sale: {
  serviceOrder: { code: number; vehicle: { plate: string | null; model: string | null } | null } | null;
}) {
  if (!sale.serviceOrder) {
    return "Venda direta no PDV";
  }

  const vehicle = sale.serviceOrder.vehicle;
  const vehicleText = vehicle
    ? ` - ${[vehicle.plate, vehicle.model].filter(Boolean).join(" ")}`
    : "";

  return `Pagamento da OS #${sale.serviceOrder.code}${vehicleText}`;
}

function buildSaleEmailContent(sale: PdvSaleEmailData, event: PdvSaleEmailEvent) {
  const shownItems = sale.items.slice(0, MAX_EMAIL_ITEMS);
  const hiddenItemsCount = Math.max(sale.items.length - shownItems.length, 0);
  const itemLines = [
    ...shownItems.map(
      (item) =>
        `${Number(item.quantity).toLocaleString("pt-BR", {
          maximumFractionDigits: 3,
        })}x ${item.description} - ${formatCurrency(item.total)}`
    ),
    ...(hiddenItemsCount > 0 ? [`+ ${hiddenItemsCount} item(ns) no registro da venda`] : []),
  ];
  const customer = sale.client?.name ?? "Cliente avulso";
  const origin = saleOrigin(sale);
  const payments = paymentSummary(sale.payments);
  const isCanceled = event === "CANCELED";
  const canceledAt = isCanceled ? formatDateTime(new Date()) : null;
  const intro = isCanceled
    ? "Uma venda do PDV foi cancelada. Os lançamentos financeiros vinculados foram estornados ou removidos."
    : "Uma venda passou pelo PDV e foi lançada no financeiro.";
  const subject = isCanceled
    ? `Venda PDV #${sale.code} cancelada`
    : `Venda PDV #${sale.code} lançada no financeiro`;
  const totalLabel = isCanceled ? "Total cancelado" : "Total recebido";
  const dateLabel = isCanceled ? "Data da venda" : "Data";

  const text = [
    intro,
    "",
    `Venda: #${sale.code}`,
    `Origem: ${origin}`,
    `Cliente: ${customer}`,
    `Setor: ${sale.sector?.name ?? sale.sectorName ?? "-"}`,
    `Responsável: ${sale.responsible ?? "-"}`,
    `${dateLabel}: ${formatDateTime(sale.createdAt)}`,
    ...(canceledAt ? [`Cancelamento: ${canceledAt}`] : []),
    `${totalLabel}: ${formatCurrency(sale.total)}`,
    "",
    "Pagamentos:",
    payments,
    "",
    "Itens:",
    ...(itemLines.length > 0 ? itemLines : ["-"]),
  ].join("\n");
  const html = `
    <p>${escapeEmailHtml(intro)}</p>
    <ul>
      <li><strong>Venda:</strong> #${sale.code}</li>
      <li><strong>Origem:</strong> ${escapeEmailHtml(origin)}</li>
      <li><strong>Cliente:</strong> ${escapeEmailHtml(customer)}</li>
      <li><strong>Setor:</strong> ${escapeEmailHtml(sale.sector?.name ?? sale.sectorName ?? "-")}</li>
      <li><strong>Responsável:</strong> ${escapeEmailHtml(sale.responsible ?? "-")}</li>
      <li><strong>${escapeEmailHtml(dateLabel)}:</strong> ${escapeEmailHtml(formatDateTime(sale.createdAt))}</li>
      ${
        canceledAt ? `<li><strong>Cancelamento:</strong> ${escapeEmailHtml(canceledAt)}</li>` : ""
      }
      <li><strong>${escapeEmailHtml(totalLabel)}:</strong> ${escapeEmailHtml(formatCurrency(sale.total))}</li>
    </ul>
    <p><strong>Pagamentos</strong></p>
    <p style="white-space: pre-line;">${escapeEmailHtml(payments)}</p>
    <p><strong>Itens</strong></p>
    <ul>${htmlList(itemLines.length > 0 ? itemLines : ["-"])}</ul>
  `;

  return { html, subject, text };
}

export async function sendPdvSaleFinancialEmail(saleId: string, tenantId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId },
    include: {
      client: { select: { name: true, mobile: true, phone1: true } },
      sector: { select: { name: true } },
      serviceOrder: {
        select: {
          code: true,
          vehicle: { select: { plate: true, model: true } },
        },
      },
      payments: { orderBy: { createdAt: "asc" } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          description: true,
          quantity: true,
          total: true,
        },
      },
    },
  });

  if (!sale) {
    return null;
  }

  const { html, subject, text } = buildSaleEmailContent(sale, "CREATED");
  const receipt = await renderSaleReceiptPdf(sale.id, tenantId);

  return emailService.sendInternalNotification({
    tenantId,
    purpose: "pdv-sale",
    subject,
    text,
    html,
    ...(receipt
      ? {
          attachments: [
            {
              filename: receipt.filename,
              content: receipt.pdfBuffer.toString("base64"),
            },
          ],
        }
      : {}),
    idempotencyKey: `pdv-sale-financial-${sale.id}`,
  });
}

export async function sendPdvSaleCancellationFinancialEmail(sale: PdvSaleEmailData) {
  if (!sale.tenantId) {
    return null;
  }

  const { html, subject, text } = buildSaleEmailContent(sale, "CANCELED");

  return emailService.sendInternalNotification({
    tenantId: sale.tenantId,
    purpose: "pdv-sale",
    subject,
    text,
    html,
    idempotencyKey: `pdv-sale-financial-canceled-${sale.id}`,
  });
}
