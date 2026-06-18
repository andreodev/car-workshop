import type { Estimate } from "../types/estimate.types";

function formatShareCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatShareDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);

  if (isoDate) {
    const [year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR");
}

function buildVehicleLabel(estimate: Estimate) {
  return [
    estimate.vehicle?.plate,
    estimate.vehicle?.brand,
    estimate.vehicle?.model,
    estimate.vehicle?.version,
  ].filter(Boolean).join(" - ");
}

export function buildEstimateMessage(estimate: Estimate) {
  const vehicle = buildVehicleLabel(estimate);
  const items = (estimate.items ?? []).map((item, index) => {
    return `${index + 1}. ${item.description} | Qtd: ${item.quantity} | Unit.: ${formatShareCurrency(
      item.unitPrice
    )} | Total: ${formatShareCurrency(item.total)}`;
  });
  const mechanic = estimate.mechanic?.name ?? estimate.convertedServiceOrder?.mechanic?.name;
  const sector = estimate.items?.find((item) => item.sector?.name)?.sector?.name;

  return [
    `Olá, segue o seu orçamento #${estimate.code}.`,
    "Preparamos tudo de forma clara e detalhada para facilitar sua decisão.",
    "",
    `Cliente: ${estimate.client?.name ?? "-"}`,
    `Veículo: ${vehicle || "-"}`,
    mechanic ? `Mecânico: ${mechanic}` : null,
    sector ? `Setor: ${sector}` : null,
    `Validade: ${formatShareDate(estimate.validUntil)}`,
    `Total: ${formatShareCurrency(estimate.total)}`,
    "",
    "Produtos e serviços:",
    ...(items.length > 0 ? items : ["Consulte o documento completo em PDF."]),
    "",
    "Condições:",
    "Nenhum serviço, peça ou valor adicional será executado/cobrado sem aprovação prévia.",
    "Itens fora deste orçamento serão informados antes da execução.",
    "",
    "Qualquer dúvida, fico à disposição.",
  ].filter((line) => line !== null).join("\n");
}

export function getEstimatePrintHref(estimateId: string) {
  return `/api/estimates/${estimateId}/pdf`;
}

export function buildEstimateShareLinks(estimate: Estimate) {
  const text = buildEstimateMessage(estimate);
  const encodedText = encodeURIComponent(text);

  return {
    text,
    emailHref: `mailto:?subject=${encodeURIComponent(
      `Orçamento #${estimate.code}`
    )}&body=${encodedText}`,
    whatsappHref: `https://wa.me/?text=${encodedText}`,
    printHref: getEstimatePrintHref(estimate.id),
  };
}
