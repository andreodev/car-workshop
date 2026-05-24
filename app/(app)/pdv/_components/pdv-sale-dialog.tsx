"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  BarcodeScanIcon,
  Cancel01Icon,
  CashierIcon,
  Delete02Icon,
  Invoice01Icon,
  PaymentSuccess01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { fetchClients } from "../../clientes/client-api";
import { createCatalogItem, createSale, fetchCatalogItems, fetchSectors } from "../pdv-api";
import type { CatalogItem, SalePaymentMethod } from "../types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PdvSaleDialogProps = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;
};

type ClientOption = {
  id: string;
  name: string;
};

type SaleLine = {
  localId: string;
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discount: number;
  total: number;
};

const paymentOptions: Array<{ value: SalePaymentMethod; label: string }> = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARTAO_CREDITO", label: "Cartao credito" },
  { value: "CARTAO_DEBITO", label: "Cartao debito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

const NO_SECTOR_VALUE = "SEM_SETOR";
const keyboardShortcuts = [
  ["F2", "Produto"],
  ["F3", "Cliente"],
  ["F4", "Qtde"],
  ["F5", "Valor"],
  ["F6", "Pagamento"],
  ["Enter", "Incluir"],
  ["F8", "Guardar"],
  ["Esc", "Fechar"],
  ["Del", "Remover último"],
] as const;

function parseDecimal(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calculateLine(quantity: number, unitPrice: number, discountPercent: number) {
  const grossTotal = quantity * unitPrice;
  const discount = Math.round(grossTotal * (discountPercent / 100) * 100) / 100;
  const total = Math.round((grossTotal - discount) * 100) / 100;
  return { discount, total };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function PdvSaleDialog({ open, defaultResponsible, onClose }: PdvSaleDialogProps) {
  const queryClient = useQueryClient();
  const clientInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitPriceInputRef = useRef<HTMLInputElement>(null);
  const paymentTriggerRef = useRef<HTMLButtonElement>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [responsible, setResponsible] = useState(defaultResponsible);
  const [sectorId, setSectorId] = useState(NO_SECTOR_VALUE);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("DINHEIRO");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clientHighlightIndex, setClientHighlightIndex] = useState(0);
  const [productHighlightIndex, setProductHighlightIndex] = useState(0);
  const [clientListOpen, setClientListOpen] = useState(false);
  const [productListOpen, setProductListOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["pdv-clients", clientSearch],
    queryFn: () =>
      fetchClients({
        page: 1,
        pageSize: 6,
        search: clientSearch,
        status: "ATIVO",
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const productsQuery = useQuery({
    queryKey: ["pdv-catalog-items", productSearch],
    queryFn: () =>
      fetchCatalogItems({
        page: 1,
        pageSize: 6,
        search: productSearch,
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const sectorsQuery = useQuery({
    queryKey: ["pdv-sectors"],
    queryFn: () =>
      fetchSectors({
        page: 1,
        pageSize: 50,
      }),
    enabled: open,
    staleTime: 60_000,
  });

  const createCatalogMutation = useMutation({
    mutationFn: createCatalogItem,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      setSelectedProduct(item);
      setProductSearch(item.name);
      setUnitPrice(String(item.unitPrice));
      setLocalError(null);
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Não foi possível cadastrar o produto."
      );
    },
  });

  const saleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setLines([]);
      setProductSearch("");
      setSelectedProduct(null);
      setQuantity("1");
      setUnitPrice("");
      setDiscountPercent("0");
      setLocalError(null);
      setSuccessMessage(`Venda ${sale.code} guardada com sucesso.`);
      requestAnimationFrame(() => productInputRef.current?.focus());
    },
    onError: (error) => {
      setLocalError(error instanceof Error ? error.message : "Erro ao guardar venda.");
    },
  });

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => ({
        subtotal: acc.subtotal + line.quantity * line.unitPrice,
        discount: acc.discount + line.discount,
        total: acc.total + line.total,
      }),
      { subtotal: 0, discount: 0, total: 0 }
    );
  }, [lines]);

  const clientOptions = clientsQuery.data?.items ?? [];
  const productOptions = productsQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => productInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function handleSelectClient(client: ClientOption) {
    setSelectedClient(client);
    setClientSearch(client.name);
    setClientListOpen(false);
    productInputRef.current?.focus();
  }

  function handleSelectProduct(item: CatalogItem) {
    setSelectedProduct(item);
    setProductSearch(item.name);
    setUnitPrice(String(item.unitPrice));
    setProductListOpen(false);
    quantityInputRef.current?.focus();
  }

  function handleAddCatalogItem() {
    const name = productSearch.trim();
    const price = parseDecimal(unitPrice);

    if (!name) {
      setLocalError("Digite o nome do produto ou serviço.");
      return;
    }

    if (price <= 0) {
      setLocalError("Informe um valor unitario maior que zero.");
      return;
    }

    createCatalogMutation.mutate({
      name,
      type: "PRODUTO",
      unitPrice: price,
    });
  }

  function handleAddLine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = (selectedProduct?.name ?? productSearch).trim();
    const parsedQuantity = parseDecimal(quantity);
    const parsedUnitPrice = parseDecimal(unitPrice);
    const parsedDiscount = parseDecimal(discountPercent);

    if (!description) {
      setLocalError("Digite ou selecione um produto.");
      return;
    }

    if (parsedQuantity <= 0) {
      setLocalError("Quantidade deve ser maior que zero.");
      return;
    }

    if (parsedUnitPrice < 0) {
      setLocalError("Valor unitário inválido.");
      return;
    }

    if (parsedDiscount < 0 || parsedDiscount > 100) {
      setLocalError("Desconto deve estar entre 0 e 100%.");
      return;
    }

    const calculated = calculateLine(parsedQuantity, parsedUnitPrice, parsedDiscount);
    setLines((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        catalogItemId: selectedProduct?.id ?? null,
        description,
        quantity: Math.round(parsedQuantity * 1000) / 1000,
        unitPrice: Math.round(parsedUnitPrice * 100) / 100,
        discountPercent: Math.round(parsedDiscount * 100) / 100,
        ...calculated,
      },
    ]);
    setProductSearch("");
    setSelectedProduct(null);
    setQuantity("1");
    setUnitPrice("");
    setDiscountPercent("0");
    setLocalError(null);
    setSuccessMessage(null);
  }

  const handleSaveSale = useCallback(() => {
    if (lines.length === 0) {
      setLocalError("Inclua pelo menos um item na venda.");
      return;
    }

    saleMutation.mutate({
      clientId: selectedClient?.id ?? null,
      sectorId: sectorId === NO_SECTOR_VALUE ? null : sectorId,
      responsible,
      paymentMethod,
      notes: null,
      items: lines.map((line) => ({
        catalogItemId: line.catalogItemId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
      })),
    });
  }, [lines, paymentMethod, responsible, saleMutation, sectorId, selectedClient?.id]);

  const handleClose = useCallback(() => {
    setLocalError(null);
    setSuccessMessage(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        productInputRef.current?.focus();
        return;
      }

      if (event.key === "F3") {
        event.preventDefault();
        clientInputRef.current?.focus();
        return;
      }

      if (event.key === "F4") {
        event.preventDefault();
        quantityInputRef.current?.focus();
        return;
      }

      if (event.key === "F5") {
        event.preventDefault();
        unitPriceInputRef.current?.focus();
        return;
      }

      if (event.key === "F6") {
        event.preventDefault();
        paymentTriggerRef.current?.focus();
        return;
      }

      if (event.key === "F8") {
        event.preventDefault();
        handleSaveSale();
        return;
      }

      if (event.key === "Delete" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setLines((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleClose, handleSaveSale, open]);

  function handleClientSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (selectedClient || clientOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setClientListOpen(true);
      setClientHighlightIndex((current) => (current + 1) % clientOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setClientListOpen(true);
      setClientHighlightIndex((current) =>
        current === 0 ? clientOptions.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter" && clientListOpen) {
      event.preventDefault();
      const highlightedClient = clientOptions[Math.min(clientHighlightIndex, clientOptions.length - 1)];
      if (highlightedClient) {
        handleSelectClient(highlightedClient);
      }
    }
  }

  function handleProductSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (selectedProduct || productOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setProductListOpen(true);
      setProductHighlightIndex((current) => (current + 1) % productOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setProductListOpen(true);
      setProductHighlightIndex((current) =>
        current === 0 ? productOptions.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter" && productListOpen) {
      event.preventDefault();
      const highlightedProduct =
        productOptions[Math.min(productHighlightIndex, productOptions.length - 1)];
      if (highlightedProduct) {
        handleSelectProduct(highlightedProduct);
      }
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-md border bg-white shadow-2xl"
        data-pdv-dialog="true"
        role="dialog"
        aria-modal="true"
        aria-label="PDV Venda balcão"
      >
        <header className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">
              PDV Venda balcão
            </h2>
            <p className="text-xs text-muted-foreground">
              Use o teclado para operar o caixa mais rápido.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Fechar PDV"
            title="Fechar PDV"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </header>

        <div className="flex flex-wrap gap-2 border-b bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
          {keyboardShortcuts.map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-neutral-800 shadow-sm">
                {key}
              </kbd>
              <span>{label}</span>
            </span>
          ))}
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="relative flex">
                <Button
                  type="button"
                  className="h-10 rounded-r-none bg-emerald-600 px-3 hover:bg-emerald-700"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch("");
                  }}
                  title="Venda sem cliente"
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
                </Button>
                <Input
                  ref={clientInputRef}
                  className="h-10 rounded-l-none"
                  placeholder="Digite para pesquisar..."
                  title="F3"
                  value={clientSearch}
                  onKeyDown={handleClientSearchKeyDown}
                  onFocus={() => setClientListOpen(true)}
                  onBlur={() => window.setTimeout(() => setClientListOpen(false), 120)}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setSelectedClient(null);
                    setClientHighlightIndex(0);
                    setClientListOpen(true);
                  }}
                />
                {clientListOpen && !selectedClient ? (
                  <div className="absolute left-10 right-0 top-11 z-20 rounded-md border bg-white shadow-lg">
                    {clientsQuery.data?.items.length ? (
                      clientsQuery.data.items.map((client, index) => (
                        <button
                          key={client.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                            index === clientHighlightIndex ? "bg-muted" : ""
                          }`}
                          onClick={() => handleSelectClient(client)}
                        >
                          {client.name}
                        </button>
                      ))
                    ) : clientsQuery.isFetching ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Carregando clientes...
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <Link href="/clientes/novo" className="text-xs text-primary hover:underline">
                  Cadastrar cliente
                </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Funcionario</Label>
                <Input
                  value={responsible}
                  onChange={(event) => setResponsible(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={sectorId} onValueChange={setSectorId}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SECTOR_VALUE}>Sem escolher setor</SelectItem>
                    {sectorsQuery.data?.items.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-right">
                  <Link href="/setores/novo" className="text-xs text-primary hover:underline">
                    Cadastrar setor
                  </Link>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as SalePaymentMethod)}
                >
                  <SelectTrigger ref={paymentTriggerRef} className="h-10 w-full" title="F6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <form onSubmit={handleAddLine} className="space-y-3 rounded-md border p-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <div className="relative flex">
                  <Button
                    type="button"
                    className="h-10 rounded-r-none bg-emerald-600 px-3 hover:bg-emerald-700"
                    onClick={handleAddCatalogItem}
                    disabled={createCatalogMutation.isPending}
                    title="Cadastrar item rapido"
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
                  </Button>
                  <div className="relative flex-1">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      strokeWidth={2}
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      ref={productInputRef}
                      className="h-10 rounded-l-none pl-9"
                      placeholder="Digite para pesquisar..."
                      title="F2"
                      value={productSearch}
                      onKeyDown={handleProductSearchKeyDown}
                      onFocus={() => setProductListOpen(true)}
                      onBlur={() => window.setTimeout(() => setProductListOpen(false), 120)}
                      onChange={(event) => {
                        setProductSearch(event.target.value);
                        setSelectedProduct(null);
                        setProductHighlightIndex(0);
                        setProductListOpen(true);
                      }}
                    />
                  </div>
                  {productListOpen && !selectedProduct ? (
                    <div className="absolute left-10 right-0 top-11 z-20 rounded-md border bg-white shadow-lg">
                      {productsQuery.data?.items.length ? (
                        productsQuery.data.items.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                              index === productHighlightIndex ? "bg-muted" : ""
                            }`}
                            onClick={() => handleSelectProduct(item)}
                          >
                            <span>{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </button>
                        ))
                      ) : productsQuery.isFetching ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Carregando produtos...
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum produto encontrado
                        </div>
                      )}
                    </div>
                ) : null}
              </div>
              <div className="text-right">
                <Link href="/produtos/novo" className="text-xs text-primary hover:underline">
                  Cadastrar produto/serviço
                </Link>
              </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Qtde.</Label>
                  <Input
                    ref={quantityInputRef}
                    title="F4"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor unit. (R$)</Label>
                  <Input
                    ref={unitPriceInputRef}
                    title="F5"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desc. %</Label>
                  <Input
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="h-10 w-full bg-blue-600 hover:bg-blue-700">
                <HugeiconsIcon icon={BarcodeScanIcon} strokeWidth={2.5} />
                Incluir
              </Button>
            </form>
          </div>

          <aside className="flex min-h-[320px] flex-col justify-between rounded-md bg-blue-500 p-6 text-white">
            <div className="flex justify-end">
              <HugeiconsIcon icon={CashierIcon} strokeWidth={1.8} className="size-12 opacity-70" />
            </div>
            <div className="space-y-8 text-right">
              <p className="text-4xl font-light">CAIXA LIVRE</p>
              <p className="text-xl">Pronto para realizar uma venda</p>
              <p className="text-4xl font-light">{formatDate(new Date())}</p>
            </div>
            <div className="text-right text-sm opacity-90">
              {selectedClient ? selectedClient.name : "Cliente nao informado"}
            </div>
          </aside>
        </div>

        <div className="px-6 pb-5">
          {localError ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-24 text-right">Qtde.</TableHead>
                  <TableHead className="w-36 text-right">Unit.</TableHead>
                  <TableHead className="w-28 text-right">Desc.</TableHead>
                  <TableHead className="w-36 text-right">Total</TableHead>
                  <TableHead className="w-16 text-right">
                    <span className="sr-only">Remover</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum item incluido.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.localId}>
                      <TableCell className="font-medium">{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.discount)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(line.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            setLines((current) =>
                              current.filter((item) => item.localId !== line.localId)
                            )
                          }
                          title="Remover item"
                          aria-label="Remover item"
                        >
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t pt-4 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-semibold">{formatCurrency(totals.subtotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Desconto</p>
                <p className="font-semibold">{formatCurrency(totals.discount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {formatCurrency(totals.total)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.5} />
                Fechar
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/pdv/vendas" onClick={handleClose}>
                  <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2.5} />
                  Listar vendas
                </Link>
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveSale}
                disabled={saleMutation.isPending}
                title="F8"
              >
                <HugeiconsIcon icon={PaymentSuccess01Icon} strokeWidth={2.5} />
                Guardar venda
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
