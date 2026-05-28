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
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

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
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function dateToInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return Number.NaN;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calculateSalePrice(purchasePrice: string, profitPercent: string) {
  const cost = parseMoney(purchasePrice);
  const profit = parseMoney(profitPercent);

  if (!Number.isFinite(cost) || !Number.isFinite(profit)) return null;

  return cost + (cost * profit) / 100;
}

function calculateProfitPreview(purchasePrice: string, salePrice: string) {
  const cost = parseMoney(purchasePrice);
  const finalPrice = parseMoney(salePrice);

  if (!Number.isFinite(cost) || !Number.isFinite(finalPrice) || cost <= 0) {
    return null;
  }

  const profitValue = finalPrice - cost;
  const profitPercent = (profitValue / cost) * 100;

  return {
    profitValue,
    profitPercent,
  };
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
          if (!item || typeof item !== "object") return { ...emptyQuote };

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

  return [
    ...items,
    ...Array.from({ length: 3 - items.length }, () => ({ ...emptyQuote })),
  ];
}

function mapItemToForm(item?: CatalogItem | null): CatalogItemFormValues {
  if (!item) return defaultForm;

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
  const [form, setForm] = useState<CatalogItemFormValues>(() =>
    mapItemToForm(initialData)
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";
  const { toast } = useToast();

  const isService = form.type === "SERVICO";
  const itemLabel = isService ? "Serviço" : "Produto";
  const itemLabelLower = isService ? "serviço" : "produto";

  const profitPreview = calculateProfitPreview(
    form.purchasePrice,
    form.salePrice || form.unitPrice
  );

  const sectorsQuery = useQuery({
    queryKey: ["product-form-sectors"],
    queryFn: () => fetchSectors({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const salePriceNumber = parseMoney(form.salePrice || form.unitPrice);

      const normalizedSalePrice = Number.isFinite(salePriceNumber)
        ? formatMoney(salePriceNumber)
        : "0";

      const normalizedProfitPercent =
        form.type === "PRODUTO" && profitPreview
          ? formatMoney(profitPreview.profitPercent)
          : form.profitPercent;

      const payload: CatalogItemFormValues = {
        ...form,
        profitPercent: normalizedProfitPercent,
        salePrice: normalizedSalePrice,
        unitPrice: normalizedSalePrice,
        stockCurrent: isService ? "0" : form.stockCurrent,
        stockMinimum: isService ? "0" : form.stockMinimum,
        stockMaximum: isService ? "0" : form.stockMaximum,
      };

      if (mode === "edit" && initialData) {
        return updateCatalogItem(initialData.id, payload);
      }

      return createCatalogItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-item"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });

      toast({
        title: mode === "edit" ? `${itemLabel} atualizado` : `${itemLabel} cadastrado`,
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });

      router.push("/produtos");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar o cadastro.";

      setLocalError(message);

      toast({
        title: `Erro ao salvar ${itemLabelLower}`,
        description: message,
        variant: "destructive",
      });
    },
  });

  function updateField<Key extends keyof CatalogItemFormValues>(
    key: Key,
    value: CatalogItemFormValues[Key]
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (next.type === "PRODUTO") {
        if (key === "purchasePrice" || key === "salePrice") {
          const preview = calculateProfitPreview(
            String(next.purchasePrice),
            String(next.salePrice)
          );

          if (preview) {
            next.profitPercent = formatMoney(preview.profitPercent);
          }

          if (key === "salePrice") {
            next.unitPrice = String(value);
          }
        }

        if (key === "profitPercent") {
          const calculatedSalePrice = calculateSalePrice(
            String(next.purchasePrice),
            String(next.profitPercent)
          );

          if (calculatedSalePrice !== null) {
            next.salePrice = formatMoney(calculatedSalePrice);
            next.unitPrice = formatMoney(calculatedSalePrice);
          }
        }
      }

      if (next.type === "SERVICO" && key === "salePrice") {
        next.unitPrice = String(value);
      }

      return next;
    });
  }

  function handleTypeChange(type: CatalogItemType) {
    setForm((current) => ({
      ...current,
      type,
      unit: type === "SERVICO" ? "UN" : current.unit || "UN",
      stockCurrent: type === "SERVICO" ? "0" : current.stockCurrent,
      stockMinimum: type === "SERVICO" ? "0" : current.stockMinimum,
      stockMaximum: type === "SERVICO" ? "0" : current.stockMaximum,
      supplierQuotes:
        type === "SERVICO"
          ? [{ ...emptyQuote }, { ...emptyQuote }, { ...emptyQuote }]
          : current.supplierQuotes,
      substituteCodes: type === "SERVICO" ? ["", ""] : current.substituteCodes,
    }));
  }

  function updateQuote(index: number, key: keyof SupplierQuoteFormValues, value: string) {
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
      setLocalError(`${itemLabel} é obrigatório.`);
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
      disabled?: boolean;
    }
  ) {
    return (
      <div className={`space-y-2 ${options?.className ?? ""}`}>
        <Label>{label}</Label>
        <Input
          type={options?.type ?? "text"}
          placeholder={options?.placeholder}
          disabled={options?.disabled}
          value={String(form[name] ?? "")}
          onChange={(event) => updateField(name, event.target.value as never)}
        />
      </div>
    );
  }

  function renderTextarea(name: TextFieldName, label: string, className = "md:col-span-2") {
    return (
      <div className={`space-y-2 ${className}`}>
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

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {renderInput(`${prefix}TaxSituation` as TextFieldName, "Situação Tributária")}
        {renderCalculationSelect(`${prefix}CalculationType` as TextFieldName, "Tipo de cálculo")}
        {renderInput(`${prefix}Base` as TextFieldName, `Base Calc ${labels[prefix]}`)}
        {renderInput(`${prefix}Rate` as TextFieldName, `Alíquota ${labels[prefix]}`)}
        {renderInput(`${prefix}Value` as TextFieldName, `Valor ${labels[prefix]}`)}
        {renderTextarea(`${prefix}Notes` as TextFieldName, "Observações")}
      </div>
    );
  }

  function renderSectorSelect() {
    return (
      <div className="space-y-2">
        <Label>Setor</Label>
        <Select
          value={form.sectorId || noSelection}
          onValueChange={(value) =>
            updateField("sectorId", value === noSelection ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={sectorsQuery.isLoading ? "Carregando setores..." : "Selecione"}
            />
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

        {sectorsQuery.isError ? (
          <p className="text-xs text-destructive">Não foi possível carregar setores.</p>
        ) : null}
      </div>
    );
  }

  function renderUnitSelect(label = "Unidade") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
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
    );
  }

  function renderStatusSelect() {
    return (
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
    );
  }

  function renderTypeSelector() {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold">Tipo de cadastro</h2>
            <p className="text-sm text-muted-foreground">
              Escolha primeiro se o item será um produto de estoque ou um serviço da oficina.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleTypeChange("PRODUTO")}
              className={`rounded-lg border p-4 text-left transition hover:border-primary/60 ${
                form.type === "PRODUTO" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-sm font-semibold">Produto</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Peças, itens de estoque, códigos, fornecedores, cotações e controle de quantidade.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange("SERVICO")}
              className={`rounded-lg border p-4 text-left transition hover:border-primary/60 ${
                form.type === "SERVICO" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="text-sm font-semibold">Serviço</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Mão de obra, diagnóstico, instalação, revisão e serviços sem movimentação de estoque.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderProductTabs() {
    return (
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
            {renderUnitSelect()}
            {renderInput("manufacturerBrand", "Fabricante / Marca")}
            {renderInput("location", "Endereço", {
              placeholder: "Ex: Localização do produto",
            })}
            {renderInput("originalCode", "Código Original")}
            {renderInput("manufacturerCode", "Código Fabricante / Fornecedor")}
            {renderSectorSelect()}
            {renderInput("expirationDate", "Data Vencimento", { type: "date" })}
            {renderInput("sku", "Código interno/SKU")}
            {renderStatusSelect()}
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Valores</h2>

              {profitPreview ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    {profitPreview.profitValue >= 0 ? "Lucro estimado: " : "Prejuízo estimado: "}
                  </span>
                  <strong className="text-foreground">
                    {formatCurrency(profitPreview.profitValue)}
                  </strong>
                  <span className="mx-1">•</span>
                  <span>Ganho: </span>
                  <strong className="text-foreground">
                    {profitPreview.profitPercent.toFixed(2)}%
                  </strong>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {renderInput("purchasePrice", "Preço de Compra")}
              {renderInput("salePrice", "Preço de Venda")}
              {renderInput("profitPercent", "% Lucro", {
                disabled: true,
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Substitutos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {form.substituteCodes.map((code, index) => (
                <div className="space-y-2" key={index}>
                  <Label>Cod produto substituto</Label>
                  <Input
                    value={code}
                    onChange={(event) => updateSubstitute(index, event.target.value)}
                  />
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
          {renderFiscalTabs("produto")}
        </TabsContent>
      </Tabs>
    );
  }

  function renderServiceTabs() {
    return (
      <Tabs defaultValue="basicos" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="basicos">Dados do serviço</TabsTrigger>
          <TabsTrigger value="valores">Valores</TabsTrigger>
          <TabsTrigger value="fiscais">Dados fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="basicos" className="space-y-5 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {renderInput("name", "Serviço", {
              placeholder: "Ex: Troca de óleo, alinhamento, diagnóstico",
            })}
            {renderInput("category", "Categoria", {
              placeholder: "Ex: Mecânica, elétrica, revisão",
            })}
            {renderInput("sku", "Código interno")}
            {renderSectorSelect()}
            {renderUnitSelect("Unidade de cobrança")}
            {renderStatusSelect()}
            {renderTextarea("applicationDescription", "Descrição do serviço", "md:col-span-2")}
            {renderTextarea("notes", "Observações internas", "md:col-span-2")}
          </div>
        </TabsContent>

        <TabsContent value="valores" className="space-y-6 text-sm">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Precificação do serviço</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {renderInput("salePrice", "Preço de venda")}
              {renderInput("unitPrice", "Valor unitário")}
              {renderInput("profitPercent", "% Margem/Lucro")}
            </div>

            <p className="text-xs text-muted-foreground">
              Serviço não movimenta estoque. Para peças usadas na OS, cadastre como produto.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="fiscais" className="space-y-4 text-sm">
          {renderFiscalTabs("serviço")}
        </TabsContent>
      </Tabs>
    );
  }

  function renderFiscalTabs(kind: "produto" | "serviço") {
    const basicTitle = kind === "serviço" ? "Fiscal do serviço" : "Dados básicos";

    return (
      <Tabs defaultValue="fiscal-basico" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="fiscal-basico">{basicTitle}</TabsTrigger>
          {kind === "produto" ? <TabsTrigger value="ipi">IPI</TabsTrigger> : null}
          <TabsTrigger value="icms">ICMS</TabsTrigger>
          <TabsTrigger value="pis">PIS</TabsTrigger>
          <TabsTrigger value="cofins">COFINS</TabsTrigger>
          {kind === "produto" ? <TabsTrigger value="importadas">Importadas</TabsTrigger> : null}
          {kind === "produto" ? <TabsTrigger value="combustiveis">Combustíveis</TabsTrigger> : null}
          <TabsTrigger value="ibs-cbs">IBS e CBS</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal-basico" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {kind === "produto" ? renderInput("taxCeanTrib", "cEAN Trib") : null}
            {renderInput("taxNcm", kind === "serviço" ? "Código fiscal/NBS" : "NCM:*")}
            {kind === "produto" ? renderInput("taxCest", "CEST:") : null}
            {renderInput("taxCfop", "CFOP:*")}
            {renderInput(
              "taxCommercialUnit",
              kind === "serviço" ? "Unidade do serviço:*" : "Un Comercial:*"
            )}
            {renderInput("taxCommercialQuantity", "Qtd Comercial:*")}
            {renderInput("taxCommercialUnitValue", "Valor Unit Comercial:*")}
            {kind === "produto" ? renderInput("taxTribUnit", "Un Trib:*") : null}
            {kind === "produto" ? renderInput("taxTribQuantity", "Qtd Trib:*") : null}
            {kind === "produto" ? renderInput("taxTribUnitValue", "Valor Unit Tributável:*") : null}
            {kind === "produto" ? renderInput("taxInsuranceTotal", "Total Seguro:") : null}
            {renderInput("taxDiscount", "Desconto")}
            {kind === "produto" ? renderInput("taxFreightTotal", "Total Frete:") : null}
            {renderInput("taxOtherExpenses", "Outras Despesas:")}
            {renderInput("taxGrossTotal", "Valor Total Bruto:*")}
            {kind === "produto" ? renderInput("taxExTipi", "EX TIPI:") : null}
            {kind === "produto" ? renderInput("taxManufacturerCnpj", "CNPJ Fabricante") : null}
            {renderInput("taxBenefitCode", "Código Benefício Fiscal:")}
            {kind === "produto" ? renderInput("taxPurchaseOrder", "Pedido de Compra:*") : null}
            {kind === "produto"
              ? renderInput("taxPurchaseOrderItem", "Número do Item do Pedido de Compra:*")
              : null}
            {kind === "produto"
              ? renderInput("taxFciControlNumber", "Número de Controle da FCI:*")
              : null}
            {renderInput("taxFederalApproxPercent", "Imposto Federal Aprox. (%)")}
            {renderInput("taxStateApproxPercent", "Imposto Estadual Aprox. (%)")}
          </div>
        </TabsContent>

        {kind === "produto" ? (
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
        ) : null}

        <TabsContent value="icms">{renderCommonTaxFields("icms")}</TabsContent>
        <TabsContent value="pis">{renderCommonTaxFields("pis")}</TabsContent>
        <TabsContent value="cofins">{renderCommonTaxFields("cofins")}</TabsContent>

        {kind === "produto" ? (
          <TabsContent value="importadas">
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("importBase", "Base de cálculo")}
              {renderInput("importExpenses", "Despesas aduaneiras")}
              {renderInput("importIof", "Valor IOF")}
              {renderInput("importValue", "Valor Imposto Importação")}
              {renderTextarea("importNotes", "Observações")}
            </div>
          </TabsContent>
        ) : null}

        {kind === "produto" ? (
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
        ) : null}

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
    );
  }

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8">
          <Header
            title={mode === "edit" ? `Editar ${itemLabelLower}` : `Cadastro de ${itemLabelLower}`}
            description={
              isService
                ? "Cadastro focado em mão de obra, precificação e dados fiscais de serviço."
                : "Cadastro completo para estoque, PDV e dados fiscais de emissão."
            }
          />

          {renderTypeSelector()}

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-6 pt-6">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro ao salvar item</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {isService ? renderServiceTabs() : renderProductTabs()}
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Revise os dados antes de salvar. O item ficará disponível no cadastro e no PDV.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.push("/produtos")}
              >
                Cancelar
              </Button>

              <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                {isSaving ? <Spinner size="sm" /> : null}
                {isSaving ? "Salvando..." : `Salvar ${itemLabelLower}`}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}