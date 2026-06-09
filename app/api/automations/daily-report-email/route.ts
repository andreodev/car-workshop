import { NextRequest } from "next/server";

import {
  escapeEmailHtml,
  parseEmailRecipients,
  sendResendEmail,
  type ResendEmailPayload,
} from "@/app/lib/resend";
import { formatCurrency } from "@/app/lib/reports";

import {
  getDailyReportData,
  getDailyReportPerformance,
  renderDailyReportPdf,
} from "./daily-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_DAILY_REPORT_EMAIL = "andreohenriqueleite@gmail.com";

function getRequestToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  return bearer ?? request.headers.get("x-automation-token");
}

function authorize(request: NextRequest) {
  const expectedTokens = [
    process.env.CRON_SECRET,
    process.env.DAILY_REPORT_EMAIL_TOKEN,
  ].filter((token): token is string => Boolean(token));

  if (expectedTokens.length === 0) {
    return {
      ok: false,
      status: 500,
      message: "Configure CRON_SECRET ou DAILY_REPORT_EMAIL_TOKEN para proteger a automacao.",
    };
  }

  if (!expectedTokens.includes(getRequestToken(request) ?? "")) {
    return {
      ok: false,
      status: 401,
      message: "Token da automacao invalido.",
    };
  }

  return { ok: true };
}

function buildEmailPayload(params: {
  from: string;
  recipients: string[];
  pdfBase64: string;
  filename: string;
  dateLabel: string;
  performanceMessage: string;
  performanceStatus: string;
  entries: number;
  exits: number;
  balance: number;
}): ResendEmailPayload {
  const subject = `Relatorio diario - ${params.dateLabel} - dia ${params.performanceStatus}`;
  const text = [
    `O fechamento de ${params.dateLabel} foi ${params.performanceStatus}.`,
    params.performanceMessage,
    "",
    `Entradas de caixa: ${formatCurrency(params.entries)}`,
    `Saidas de caixa: ${formatCurrency(params.exits)}`,
    `Saldo de caixa: ${formatCurrency(params.balance)}`,
    "",
    "O PDF do relatorio diario esta anexado.",
  ].join("\n");
  const html = `
    <p>O fechamento de <strong>${escapeEmailHtml(params.dateLabel)}</strong> foi <strong>${escapeEmailHtml(
      params.performanceStatus
    )}</strong>.</p>
    <p>${escapeEmailHtml(params.performanceMessage)}</p>
    <ul>
      <li>Entradas de caixa: <strong>${escapeEmailHtml(formatCurrency(params.entries))}</strong></li>
      <li>Saidas de caixa: <strong>${escapeEmailHtml(formatCurrency(params.exits))}</strong></li>
      <li>Saldo de caixa: <strong>${escapeEmailHtml(formatCurrency(params.balance))}</strong></li>
    </ul>
    <p>O PDF do relatorio diario esta anexado.</p>
  `;

  return {
    from: params.from,
    to: params.recipients,
    subject,
    text,
    html,
    attachments: [
      {
        filename: params.filename,
        content: params.pdfBase64,
      },
    ],
  };
}

async function handleDailyReportEmail(request: NextRequest) {
  const auth = authorize(request);

  if (!auth.ok) {
    return Response.json({ message: auth.message }, { status: auth.status });
  }

  const recipients = parseEmailRecipients(
    process.env.DAILY_REPORT_EMAIL_RECIPIENTS || DEFAULT_DAILY_REPORT_EMAIL
  );

  if (recipients.length === 0) {
    return Response.json(
      { message: "Configure DAILY_REPORT_EMAIL_RECIPIENTS com pelo menos um email." },
      { status: 500 }
    );
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    return Response.json(
      { message: "Configure RESEND_FROM_EMAIL com o remetente verificado no Resend." },
      { status: 500 }
    );
  }

  const dateKey = request.nextUrl.searchParams.get("date");
  const isTestSend = request.nextUrl.searchParams.get("test") === "1";
  const report = await getDailyReportData({ dateKey });
  const pdfBuffer = await renderDailyReportPdf(report);
  const performance = getDailyReportPerformance(report);
  const filename = `relatorio-diario-${report.dateKey}.pdf`;
  const payload = buildEmailPayload({
    from,
    recipients,
    pdfBase64: pdfBuffer.toString("base64"),
    filename,
    dateLabel: report.dateLabel,
    performanceMessage: performance.message,
    performanceStatus: performance.status,
    entries: report.cash.entries,
    exits: report.cash.exits,
    balance: report.cash.balance,
  });
  let resendResult: unknown = null;

  try {
    const idempotencyKey = isTestSend
      ? `daily-report-test-${report.dateKey}-${Date.now()}`
      : `daily-report-${report.dateKey}-${recipients.join("-")}`;

    resendResult = await sendResendEmail(
      payload,
      idempotencyKey
    );
  } catch (error) {
    return Response.json(
      {
        message: "Falha ao enviar relatorio diario pelo Resend.",
        details: error instanceof Error && "details" in error ? error.details : error,
      },
      { status: 502 }
    );
  }

  return Response.json({
    message: "Relatorio diario enviado.",
    date: report.dateKey,
    recipients,
    performance: performance.status,
    balance: report.cash.balance,
    test: isTestSend,
    resend: resendResult,
  });
}

export async function GET(request: NextRequest) {
  return handleDailyReportEmail(request);
}

export async function POST(request: NextRequest) {
  return handleDailyReportEmail(request);
}
