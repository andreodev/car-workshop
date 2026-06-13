import type { CompanySettings } from "../../configuracoes/dados-empresa/types";
import type { Estimate } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import logo from "@/assets/logo/logo.png";
import Image from "next/image";

function formatCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatDate(value: string | null) {
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

function formatDocument(value?: string | null) {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) {
    return value;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value?: string | null) {
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

function buildAddress(settings?: CompanySettings | null) {
  if (!settings) {
    return "";
  }
  const line1 = [settings.address, settings.number].filter(Boolean).join(", ");
  const line2 = [settings.neighborhood, settings.city, settings.state]
    .filter(Boolean)
    .join(" • ");
  const line3 = settings.cep ? `CEP ${settings.cep}` : "";
  return [line1, line2, line3].filter(Boolean).join(" | ");
}

function formatVehicle(estimate: Estimate) {
  return [
    estimate.vehicle?.plate,
    estimate.vehicle?.brand,
    estimate.vehicle?.model,
    estimate.vehicle?.version,
  ]
    .filter(Boolean)
    .join(" - ");
}

type EstimatePrintProps = {
  estimate: Estimate;
  companySettings?: CompanySettings | null;
};

export function EstimatePrint({ estimate, companySettings }: EstimatePrintProps) {
  const items = estimate.items ?? [];
  const address = buildAddress(companySettings);
  const contactPhone = formatPhone(companySettings?.phone) ?? formatPhone(companySettings?.whatsapp);
  const logoSrc = companySettings?.logoUrl ?? logo.src;
  const companyName = companySettings?.tradeName || companySettings?.legalName || "Empresa";
  const legalName = companySettings?.legalName ? `Razao social: ${companySettings.legalName}` : null;
  const cnpj = formatDocument(companySettings?.document);
  const issuedDate = formatDate(estimate.createdAt);

  return (
    <section className="print-page mx-auto flex w-full max-w-5xl flex-col gap-6 border border-border bg-white p-6">
      <header className="flex flex-col gap-6 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src={logoSrc} alt={companyName} className="h-14 w-14 rounded-md object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Orçamento
              </p>
              <h1 className="text-2xl font-semibold text-foreground">{companyName}</h1>
              {legalName ? (
                <p className="text-xs text-muted-foreground">{legalName}</p>
              ) : null}
              {address ? <p className="text-xs text-muted-foreground">{address}</p> : null}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {contactPhone ? <span>{contactPhone}</span> : null}
                {companySettings?.email ? <span>{companySettings.email}</span> : null}
                {companySettings?.website ? <span>{companySettings.website}</span> : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:min-w-55">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Documento
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">Orçamento #{estimate.code}</p>
            <div className="mt-2 grid gap-1">
              <span>Emissao: {issuedDate}</span>
              <span>Validade: {formatDate(estimate.validUntil)}</span>
              {cnpj ? <span>CNPJ: {cnpj}</span> : null}
              {companySettings?.stateRegistration ? (
                <span>IE: {companySettings.stateRegistration}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{estimate.client?.name ?? "-"}</span>
          </p>
          <p className="text-muted-foreground">
            Veículo: <span className="font-medium text-foreground">{formatVehicle(estimate) || "-"}</span>
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Mecânico</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {estimate.mechanic?.name ?? "-"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Setor</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {estimate.items?.find((item) => item.sector?.name)?.sector?.name ?? "-"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Responsável</p>
          <p className="mt-1 text-sm font-medium text-foreground">{estimate.responsible}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Unitário</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum item informado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.catalogItem?.name ?? "Item sem catálogo"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.discount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="mt-1 font-mono text-base font-semibold">
            {formatCurrency(estimate.subtotal)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Desconto</p>
          <p className="mt-1 font-mono text-base font-semibold">
            {formatCurrency(estimate.discountTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 font-mono text-base font-semibold text-primary">
            {formatCurrency(estimate.total)}
          </p>
        </div>
      </div>

      {(estimate.notesClient || estimate.notesInternal) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Observações para o cliente</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {estimate.notesClient || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Observações internas</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {estimate.notesInternal || "-"}
            </p>
          </div>
        </div>
      ) : null}

      {(companySettings?.commercialNotes || companySettings?.documentFooter) ? (
        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          {companySettings?.commercialNotes ? (
            <p className="whitespace-pre-wrap">{companySettings.commercialNotes}</p>
          ) : null}
          {companySettings?.documentFooter ? (
            <p className="mt-2 whitespace-pre-wrap">{companySettings.documentFooter}</p>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
