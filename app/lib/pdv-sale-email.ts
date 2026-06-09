import type { SalePaymentMethod } from "@prisma/client";

import { renderSaleReceiptPdf } from "@/app/api/sales/[id]/receipt/receipt-pdf";
import { prisma } from "@/app/lib/prisma";
import { escapeEmailHtml, parseEmailRecipients, sendResendEmail } from "@/app/lib/resend";
import { formatCurrency } from "@/app/lib/reports";
import { getPaymentMethodLabel } from "@/app/(app)/financeiro/status";

const DEFAULT_NOTIFICATION_EMAIL = "andreohenriqueleite@gmail.com";
const MAX_EMAIL_ITEMS = 8;

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

export async function sendPdvSaleFinancialEmail(saleId: string) {
  const recipients = parseEmailRecipients(
    process.env.PDV_SALE_EMAIL_RECIPIENTS ||
      process.env.DAILY_REPORT_EMAIL_RECIPIENTS ||
      DEFAULT_NOTIFICATION_EMAIL
  );
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (recipients.length === 0 || !from) {
    return null;
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
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
  const subject = `Venda PDV #${sale.code} lancada no financeiro`;
  const text = [
    `Uma venda passou pelo PDV e foi lancada no financeiro.`,
    "",
    `Venda: #${sale.code}`,
    `Origem: ${origin}`,
    `Cliente: ${customer}`,
    `Setor: ${sale.sector?.name ?? sale.sectorName ?? "-"}`,
    `Responsavel: ${sale.responsible ?? "-"}`,
    `Data: ${formatDateTime(sale.createdAt)}`,
    `Total recebido: ${formatCurrency(sale.total)}`,
    "",
    "Pagamentos:",
    payments,
    "",
    "Itens:",
    ...(itemLines.length > 0 ? itemLines : ["-"]),
  ].join("\n");
  const html = `
    <p>Uma venda passou pelo PDV e foi lancada no financeiro.</p>
    <ul>
      <li><strong>Venda:</strong> #${sale.code}</li>
      <li><strong>Origem:</strong> ${escapeEmailHtml(origin)}</li>
      <li><strong>Cliente:</strong> ${escapeEmailHtml(customer)}</li>
      <li><strong>Setor:</strong> ${escapeEmailHtml(sale.sector?.name ?? sale.sectorName ?? "-")}</li>
      <li><strong>Responsavel:</strong> ${escapeEmailHtml(sale.responsible ?? "-")}</li>
      <li><strong>Data:</strong> ${escapeEmailHtml(formatDateTime(sale.createdAt))}</li>
      <li><strong>Total recebido:</strong> ${escapeEmailHtml(formatCurrency(sale.total))}</li>
    </ul>
    <p><strong>Pagamentos</strong></p>
    <p style="white-space: pre-line;">${escapeEmailHtml(payments)}</p>
    <p><strong>Itens</strong></p>
    <ul>${htmlList(itemLines.length > 0 ? itemLines : ["-"])}</ul>
  `;
  const receipt = await renderSaleReceiptPdf(sale.id);

  return sendResendEmail(
    {
      from,
      to: recipients,
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
    },
    `pdv-sale-financial-${sale.id}`
  );
}
