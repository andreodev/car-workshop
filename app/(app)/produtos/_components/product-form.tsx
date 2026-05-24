"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  createCatalogItem,
  fetchSectors,
  updateCatalogItem,
} from "../../pdv/pdv-api";
import type {
  CatalogItem,
  CatalogItemFormValues,
  CatalogItemType,
  SupplierQuoteFormValues,
} from "../../pdv/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ProductFormProps = {
  initialData?: CatalogItem | null;
};

type TextFieldName = keyof CatalogItemFormValues;

const noSelection = "__none";
const units = ["UN", "PC", "CX", "KG", "L", "M", "PAR", "JG"];
const calculationTypes = ["Porcentagem", "Valor", "Quantidade"];

const emptyQuote: SupplierQuoteFormValues = {
  quotedAt: "",
  quotedValue: "",
  quantity: "",
  supplierName: "",
};

const defaultForm: CatalogItemFormValues = {
  name: "",
  type: "PRODUTO",
  sku: "",
  barcode: "",
  category: "",
  unit: "UN",
  manufacturerBrand: "",
  location: "",
  originalCode: "",
  manufacturerCode: "",
  sectorId: "",
  expirationDate: "",
  stockCurrent: "0",
  stockMinimum: "0",
  stockMaximum: "0",
  tablePrice: "0",
  supplierDiscountPercent: "0",
  purchasePrice: "0",
  profitPercent: "0",
  salePrice: "0",
  unitPrice: "0",
  applicationDescription: "",
  substituteCodes: ["", ""],
  supplierQuotes: [{ ...emptyQuote }, { ...emptyQuote }, { ...emptyQuote }],
  taxCeanTrib: "",
  taxNcm: "00000000",
  taxCest: "0000000",
  taxCfop: "5105",
  taxCommercialUnit: "UN",
  taxCommercialQuantity: "1",
  taxCommercialUnitValue: "0",
  taxTribUnit: "UN",
  taxTribQuantity: "1",
  taxTribUnitValue: "0",
  taxInsuranceTotal: "0",
  taxDiscount: "0",
  taxFreightTotal: "0",
  taxOtherExpenses: "0",
  taxGrossTotal: "0",
  taxExTipi: "",
  taxScaleIndicator: "",
  taxManufacturerCnpj: "",
  taxBenefitCode: "",
  taxPurchaseOrder: "0",
  taxPurchaseOrderItem: "0",
  taxFciControlNumber: "0",
  taxFederalApproxPercent: "0",
  taxStateApproxPercent: "0",
  ipiTaxSituation: "",
  ipiClass: "",
  ipiLegalCode: "0",
  ipiProducerCnpj: "",
  ipiSealCode: "0",
  ipiSealQuantity: "0",
  ipiCalculationType: "Porcentagem",
  ipiBase: "0",
  ipiRate: "0",
  ipiUnitValue: "0",
  ipiValue: "0",
  icmsTaxSituation: "",
  icmsCalculationType: "Porcentagem",
  icmsBase: "0",
  icmsRate: "0",
  icmsValue: "0",
  icmsNotes: "",
  pisTaxSituation: "",
  pisCalculationType: "Porcentagem",
  pisBase: "0",
  pisRate: "0",
  pisValue: "0",
  pisNotes: "",
  cofinsTaxSituation: "",
  cofinsCalculationType: "Porcentagem",
  cofinsBase: "0",
  cofinsRate: "0",
  cofinsValue: "0",
  cofinsNotes: "",
  importBase: "0",
  importExpenses: "0",
  importIof: "0",
  importValue: "0",
  importNotes: "",
  fuelAnpCode: "",
  fuelDescription: "",
  fuelGlpPercent: "0",
  fuelNationalGasPercent: "0",
  fuelImportedGasPercent: "0",
  fuelCideBase: "0",
  fuelCideRate: "0",
  fuelCideValue: "0",
  fuelNotes: "",
  ibsCbsCst: "",
  ibsCbsClassification: "",
  ibsUfRate: "0",
  ibsMunicipalRate: "0",
  cbsRate: "0",
  ibsValue: "0",
  cbsValue: "0",
  ibsCbsNotes: "",
  active: true,
  notes: "",
};

function decimalToString(value: string | number | null | undefined, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function dateToInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseStringArray(value: unknown, size: number) {
  const items = Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : "")).slice(0, size)
    : [];

  return [...items, ...Array.from({ length: size - items.length }, () => "")];
}

function parseSupplierQuotes(value: unknown) {
  const items = Array.isArray(value)
    ? value
        .map((item) => {
          if (!item || typeof item !== "object") {
            return { ...emptyQuote };
          }

          const quote = item as Partial<SupplierQuoteFormValues>;
          return {
            quotedAt: decimalToString(quote.quotedAt),
            quotedValue: decimalToString(quote.quotedValue),
            quantity: decimalToString(quote.quantity),
            supplierName: decimalToString(quote.supplierName),
          };
        })
        .slice(0, 3)
    : [];

  return [...items, ...Array.from({ length: 3 - items.length }, () => ({ ...emptyQuote }))];
}

function mapItemToForm(item?: CatalogItem | null): CatalogItemFormValues {
  if (!item) {
    return defaultForm;
  }

  const salePrice = decimalToString(item.salePrice ?? item.unitPrice, "0");

  return {
    ...defaultForm,
    name: item.name ?? "",
    type: item.type ?? "PRODUTO",
    sku: item.sku ?? "",
    barcode: item.barcode ?? "",
    category: item.category ?? "",
    unit: item.unit ?? "UN",
    manufacturerBrand: item.manufacturerBrand ?? "",
    location: item.location ?? "",
    originalCode: item.originalCode ?? "",
    manufacturerCode: item.manufacturerCode ?? "",
    sectorId: item.sectorId ?? "",
    expirationDate: dateToInput(item.expirationDate),
    stockCurrent: decimalToString(item.stockCurrent, "0"),
    stockMinimum: decimalToString(item.stockMinimum, "0"),
    stockMaximum: decimalToString(item.stockMaximum, "0"),
    tablePrice: decimalToString(item.tablePrice, "0"),
    supplierDiscountPercent: decimalToString(item.supplierDiscountPercent, "0"),
    purchasePrice: decimalToString(item.purchasePrice, "0"),
    profitPercent: decimalToString(item.profitPercent, "0"),
    salePrice,
    unitPrice: decimalToString(item.unitPrice, salePrice),
    applicationDescription: item.applicationDescription ?? "",
    substituteCodes: parseStringArray(item.substituteCodes, 2),
    supplierQuotes: parseSupplierQuotes(item.supplierQuotes),
    taxCeanTrib: item.taxCeanTrib ?? "",
    taxNcm: item.taxNcm ?? "00000000",
    taxCest: item.taxCest ?? "0000000",
    taxCfop: item.taxCfop ?? "5105",
    taxCommercialUnit: item.taxCommercialUnit ?? "UN",
    taxCommercialQuantity: decimalToString(item.taxCommercialQuantity, "1"),
    taxCommercialUnitValue: decimalToString(item.taxCommercialUnitValue, "0"),
    taxTribUnit: item.taxTribUnit ?? "UN",
    taxTribQuantity: decimalToString(item.taxTribQuantity, "1"),
    taxTribUnitValue: decimalToString(item.taxTribUnitValue, "0"),
    taxInsuranceTotal: decimalToString(item.taxInsuranceTotal, "0"),
    taxDiscount: decimalToString(item.taxDiscount, "0"),
    taxFreightTotal: decimalToString(item.taxFreightTotal, "0"),
    taxOtherExpenses: decimalToString(item.taxOtherExpenses, "0"),
    taxGrossTotal: decimalToString(item.taxGrossTotal, "0"),
    taxExTipi: item.taxExTipi ?? "",
    taxScaleIndicator: item.taxScaleIndicator ?? "",
    taxManufacturerCnpj: item.taxManufacturerCnpj ?? "",
    taxBenefitCode: item.taxBenefitCode ?? "",
    taxPurchaseOrder: item.taxPurchaseOrder ?? "0",
    taxPurchaseOrderItem: item.taxPurchaseOrderItem ?? "0",
    taxFciControlNumber: item.taxFciControlNumber ?? "0",
    taxFederalApproxPercent: decimalToString(item.taxFederalApproxPercent, "0"),
    taxStateApproxPercent: decimalToString(item.taxStateApproxPercent, "0"),
    ipiTaxSituation: item.ipiTaxSituation ?? "",
    ipiClass: item.ipiClass ?? "",
    ipiLegalCode: item.ipiLegalCode ?? "0",
    ipiProducerCnpj: item.ipiProducerCnpj ?? "",
    ipiSealCode: item.ipiSealCode ?? "0",
    ipiSealQuantity: decimalToString(item.ipiSealQuantity, "0"),
    ipiCalculationType: item.ipiCalculationType ?? "Porcentagem",
    ipiBase: decimalToString(item.ipiBase, "0"),
    ipiRate: decimalToString(item.ipiRate, "0"),
    ipiUnitValue: decimalToString(item.ipiUnitValue, "0"),
    ipiValue: decimalToString(item.ipiValue, "0"),
    icmsTaxSituation: item.icmsTaxSituation ?? "",
    icmsCalculationType: item.icmsCalculationType ?? "Porcentagem",
    icmsBase: decimalToString(item.icmsBase, "0"),
    icmsRate: decimalToString(item.icmsRate, "0"),
    icmsValue: decimalToString(item.icmsValue, "0"),
    icmsNotes: item.icmsNotes ?? "",
    pisTaxSituation: item.pisTaxSituation ?? "",
    pisCalculationType: item.pisCalculationType ?? "Porcentagem",
    pisBase: decimalToString(item.pisBase, "0"),
    pisRate: decimalToString(item.pisRate, "0"),
    pisValue: decimalToString(item.pisValue, "0"),
    pisNotes: item.pisNotes ?? "",
    cofinsTaxSituation: item.cofinsTaxSituation ?? "",
    cofinsCalculationType: item.cofinsCalculationType ?? "Porcentagem",
    cofinsBase: decimalToString(item.cofinsBase, "0"),
    cofinsRate: decimalToString(item.cofinsRate, "0"),
    cofinsValue: decimalToString(item.cofinsValue, "0"),
    cofinsNotes: item.cofinsNotes ?? "",
    importBase: decimalToString(item.importBase, "0"),
    importExpenses: decimalToString(item.importExpenses, "0"),
    importIof: decimalToString(item.importIof, "0"),
    importValue: decimalToString(item.importValue, "0"),
    importNotes: item.importNotes ?? "",
    fuelAnpCode: item.fuelAnpCode ?? "",
    fuelDescription: item.fuelDescription ?? "",
    fuelGlpPercent: decimalToString(item.fuelGlpPercent, "0"),
    fuelNationalGasPercent: decimalToString(item.fuelNationalGasPercent, "0"),
    fuelImportedGasPercent: decimalToString(item.fuelImportedGasPercent, "0"),
    fuelCideBase: decimalToString(item.fuelCideBase, "0"),
    fuelCideRate: decimalToString(item.fuelCideRate, "0"),
    fuelCideValue: decimalToString(item.fuelCideValue, "0"),
    fuelNotes: item.fuelNotes ?? "",
    ibsCbsCst: item.ibsCbsCst ?? "",
    ibsCbsClassification: item.ibsCbsClassification ?? "",
    ibsUfRate: decimalToString(item.ibsUfRate, "0"),
    ibsMunicipalRate: decimalToString(item.ibsMunicipalRate, "0"),
    cbsRate: decimalToString(item.cbsRate, "0"),
    ibsValue: decimalToString(item.ibsValue, "0"),
    cbsValue: decimalToString(item.cbsValue, "0"),
    ibsCbsNotes: item.ibsCbsNotes ?? "",
    active: item.active ?? true,
    notes: item.notes ?? "",
  };
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CatalogItemFormValues>(() => mapItemToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";

  const sectorsQuery = useQuery({
    queryKey: ["product-form-sectors"],
    queryFn: () => fetchSectors({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const salePrice = String(parseMoney(form.salePrice || form.unitPrice));
      const payload = { ...form, salePrice, unitPrice: salePrice };

      if (mode === "edit" && initialData) {
        return updateCatalogItem(initialData.id, payload);
      }

      return createCatalogItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-item"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      router.push("/produtos");
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Não foi possível salvar o cadastro."
      );
    },
  });

  function updateField<Key extends keyof CatalogItemFormValues>(
    key: Key,
    value: CatalogItemFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateQuote(
    index: number,
    key: keyof SupplierQuoteFormValues,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      supplierQuotes: current.supplierQuotes.map((quote, quoteIndex) =>
        quoteIndex === index ? { ...quote, [key]: value } : quote
      ),
    }));
  }

  function updateSubstitute(index: number, value: string) {
    setForm((current) => ({
      ...current,
      substituteCodes: current.substituteCodes.map((code, codeIndex) =>
        codeIndex === index ? value : code
      ),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.name.trim()) {
      setLocalError("Produto é obrigatório.");
      return;
    }

    const salePrice = parseMoney(form.salePrice || form.unitPrice);

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setLocalError("Preço de venda inválido.");
      return;
    }

    mutation.mutate();
  }

  function renderInput(
    name: TextFieldName,
    label: string,
    options?: {
      type?: string;
      placeholder?: string;
      className?: string;
    }
  ) {
    return (
      <div className={`space-y-2 ${options?.className ?? ""}`}>
        <Label>{label}</Label>
        <Input
          type={options?.type ?? "text"}
          placeholder={options?.placeholder}
          value={String(form[name] ?? "")}
          onChange={(event) => updateField(name, event.target.value as never)}
        />
      </div>
    );
  }

  function renderTextarea(name: TextFieldName, label: string) {
    return (
      <div className="space-y-2 md:col-span-2">
        <Label>{label}</Label>
        <Textarea
          value={String(form[name] ?? "")}
          onChange={(event) => updateField(name, event.target.value as never)}
        />
      </div>
    );
  }

  function renderCalculationSelect(name: TextFieldName, label: string) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select
          value={String(form[name] || "Porcentagem")}
          onValueChange={(value) => updateField(name, value as never)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {calculationTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderCommonTaxFields(prefix: "icms" | "pis" | "cofins") {
    const labels = {
      icms: "ICMS",
      pis: "PIS",
      cofins: "COFINS",
    };
    const fieldPrefix = prefix === "cofins" ? "cofins" : prefix;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {renderInput(`${fieldPrefix}TaxSituation` as TextFieldName, "Situação Tributária")}
        {renderCalculationSelect(`${fieldPrefix}CalculationType` as TextFieldName, "Tipo de cálculo")}
        {renderInput(`${fieldPrefix}Base` as TextFieldName, `Base Calc ${labels[prefix]}`)}
        {renderInput(`${fieldPrefix}Rate` as TextFieldName, `Alíquota ${labels[prefix]}`)}
        {renderInput(`${fieldPrefix}Value` as TextFieldName, `Valor ${labels[prefix]}`)}
        {renderTextarea(`${fieldPrefix}Notes` as TextFieldName, "Observações")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold">
          {mode === "edit" ? "Editar produto/serviço" : "Cadastrar produto/serviço"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastro completo para estoque, PDV e dados fiscais de emissão.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </div>
      ) : null}

      <Tabs defaultValue="basicos" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="basicos">Dados básicos</TabsTrigger>
          <TabsTrigger value="estoque">Estoque e valores</TabsTrigger>
          <TabsTrigger value="fiscais">Dados fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="basicos" className="space-y-5 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {renderInput("barcode", "Código de barras")}
            {renderInput("name", "Produto", {
              placeholder: "Ex: Amortecedor de suspensão",
            })}
            {renderInput("category", "Categoria", { placeholder: "ABRAÇADEIRAS" })}
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unit || "UN"} onValueChange={(value) => updateField("unit", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderInput("manufacturerBrand", "Fabricante / Marca")}
            {renderInput("location", "Endereço", {
              placeholder: "Ex: Localização do produto",
            })}
            {renderInput("originalCode", "Código Original")}
            {renderInput("manufacturerCode", "Código Fabricante / Fornecedor")}
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select
                value={form.sectorId || noSelection}
                onValueChange={(value) =>
                  updateField("sectorId", value === noSelection ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noSelection}>Sem escolher setor</SelectItem>
                  {sectorsQuery.data?.items.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderInput("expirationDate", "Data Vencimento", { type: "date" })}
            {renderInput("sku", "Código interno/SKU")}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => updateField("type", value as CatalogItemType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUTO">Produto</SelectItem>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={form.active ? "ATIVO" : "INATIVO"}
                onValueChange={(value) => updateField("active", value === "ATIVO")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderTextarea("applicationDescription", "Descrição Aplicação")}
            {renderTextarea("notes", "Observações")}
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-6 text-sm">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Estoque</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {renderInput("stockCurrent", "Atual")}
              {renderInput("stockMinimum", "Mínimo")}
              {renderInput("stockMaximum", "Máximo")}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Valores</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {renderInput("tablePrice", "Preço de Tabela")}
              {renderInput("supplierDiscountPercent", "% Desconto forn")}
              {renderInput("purchasePrice", "Preço de Compra")}
              {renderInput("profitPercent", "% Lucro")}
              {renderInput("salePrice", "Preço de Venda")}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Substitutos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {form.substituteCodes.map((code, index) => (
                <div className="space-y-2" key={index}>
                  <Label>Cod produto substituto</Label>
                  <Input value={code} onChange={(event) => updateSubstitute(index, event.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Fornecedores e cotações</h2>
            <div className="space-y-4">
              {form.supplierQuotes.map((quote, index) => (
                <div className="grid gap-4 rounded-md border p-4 md:grid-cols-4" key={index}>
                  <div className="space-y-2">
                    <Label>Data da cotação</Label>
                    <Input
                      type="date"
                      value={quote.quotedAt}
                      onChange={(event) => updateQuote(index, "quotedAt", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor cotado</Label>
                    <Input
                      value={quote.quotedValue}
                      onChange={(event) => updateQuote(index, "quotedValue", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      value={quote.quantity}
                      onChange={(event) => updateQuote(index, "quantity", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input
                      placeholder="Insira o nome..."
                      value={quote.supplierName}
                      onChange={(event) => updateQuote(index, "supplierName", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="fiscais" className="space-y-4 text-sm">
          <Tabs defaultValue="fiscal-basico" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="fiscal-basico">Dados básicos</TabsTrigger>
              <TabsTrigger value="ipi">IPI</TabsTrigger>
              <TabsTrigger value="icms">ICMS</TabsTrigger>
              <TabsTrigger value="pis">PIS</TabsTrigger>
              <TabsTrigger value="cofins">COFINS</TabsTrigger>
              <TabsTrigger value="importadas">Importadas</TabsTrigger>
              <TabsTrigger value="combustiveis">Combustíveis</TabsTrigger>
              <TabsTrigger value="ibs-cbs">IBS e CBS</TabsTrigger>
            </TabsList>

            <TabsContent value="fiscal-basico" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {renderInput("taxCeanTrib", "cEAN Trib")}
                {renderInput("taxNcm", "NCM:*")}
                {renderInput("taxCest", "CEST:")}
                {renderInput("taxCfop", "CFOP:*")}
                {renderInput("taxCommercialUnit", "Un Comercial:*")}
                {renderInput("taxCommercialQuantity", "Qtd Comercial:*")}
                {renderInput("taxCommercialUnitValue", "Valor Unit Comercial:*")}
                {renderInput("taxTribUnit", "Un Trib:*")}
                {renderInput("taxTribQuantity", "Qtd Trib:*")}
                {renderInput("taxTribUnitValue", "Valor Unit Tributável:*")}
                {renderInput("taxInsuranceTotal", "Total Seguro:")}
                {renderInput("taxDiscount", "Desconto")}
                {renderInput("taxFreightTotal", "Total Frete:")}
                {renderInput("taxOtherExpenses", "Outras Despesas:")}
                {renderInput("taxGrossTotal", "Valor Total Bruto:*")}
                {renderInput("taxExTipi", "EX TIPI:")}
                <div className="space-y-2">
                  <Label>Indicador de Escala Relevante</Label>
                  <Select
                    value={form.taxScaleIndicator || noSelection}
                    onValueChange={(value) =>
                      updateField("taxScaleIndicator", value === noSelection ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={noSelection}>- Não usar -</SelectItem>
                      <SelectItem value="S">Sim</SelectItem>
                      <SelectItem value="N">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {renderInput("taxManufacturerCnpj", "CNPJ Fabricante")}
                {renderInput("taxBenefitCode", "Código Benefício Fiscal:")}
                {renderInput("taxPurchaseOrder", "Pedido de Compra:*")}
                {renderInput("taxPurchaseOrderItem", "Número do Item do Pedido de Compra:*")}
                {renderInput("taxFciControlNumber", "Número de Controle da FCI:*")}
                {renderInput("taxFederalApproxPercent", "Imposto Federal Aprox. (%)")}
                {renderInput("taxStateApproxPercent", "Imposto Estadual Aprox. (%)")}
              </div>
            </TabsContent>

            <TabsContent value="ipi">
              <div className="grid gap-4 md:grid-cols-3">
                {renderInput("ipiTaxSituation", "Situação Tributária")}
                {renderInput("ipiClass", "Classe enquadramento")}
                {renderInput("ipiLegalCode", "Código enquadramento legal IPI*")}
                {renderInput("ipiProducerCnpj", "CNPJ produtor")}
                {renderInput("ipiSealCode", "Cód Selo de Controle IPI")}
                {renderInput("ipiSealQuantity", "Quantidade de selo de Controle IPI")}
                {renderCalculationSelect("ipiCalculationType", "Tipo de cálculo")}
                {renderInput("ipiBase", "Base Calc IPI")}
                {renderInput("ipiRate", "Alíquota IPI")}
                {renderInput("ipiUnitValue", "Valor por unid trib.")}
                {renderInput("ipiValue", "Valor do IPI")}
              </div>
            </TabsContent>

            <TabsContent value="icms">{renderCommonTaxFields("icms")}</TabsContent>
            <TabsContent value="pis">{renderCommonTaxFields("pis")}</TabsContent>
            <TabsContent value="cofins">{renderCommonTaxFields("cofins")}</TabsContent>

            <TabsContent value="importadas">
              <div className="grid gap-4 md:grid-cols-2">
                {renderInput("importBase", "Base de cálculo")}
                {renderInput("importExpenses", "Despesas aduaneiras")}
                {renderInput("importIof", "Valor IOF")}
                {renderInput("importValue", "Valor Imposto Importação")}
                {renderTextarea("importNotes", "Observações")}
              </div>
            </TabsContent>

            <TabsContent value="combustiveis">
              <div className="grid gap-4 md:grid-cols-2">
                {renderInput("fuelAnpCode", "Código ANP")}
                {renderInput("fuelDescription", "Descrição ANP")}
                {renderInput("fuelGlpPercent", "% GLP")}
                {renderInput("fuelNationalGasPercent", "% Gás Natural Nacional")}
                {renderInput("fuelImportedGasPercent", "% Gás Natural Importado")}
                {renderInput("fuelCideBase", "Base CIDE")}
                {renderInput("fuelCideRate", "Alíquota CIDE")}
                {renderInput("fuelCideValue", "Valor CIDE")}
                {renderTextarea("fuelNotes", "Observações")}
              </div>
            </TabsContent>

            <TabsContent value="ibs-cbs">
              <div className="grid gap-4 md:grid-cols-2">
                {renderInput("ibsCbsCst", "CST IBS/CBS")}
                {renderInput("ibsCbsClassification", "Classificação Tributária")}
                {renderInput("ibsUfRate", "Alíquota IBS UF")}
                {renderInput("ibsMunicipalRate", "Alíquota IBS Municipal")}
                {renderInput("cbsRate", "Alíquota CBS")}
                {renderInput("ibsValue", "Valor IBS")}
                {renderInput("cbsValue", "Valor CBS")}
                {renderTextarea("ibsCbsNotes", "Observações")}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/produtos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
