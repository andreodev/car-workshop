"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchClients } from "../../clientes/client-api";
import { createCatalogItem, createSale, fetchCatalogItems, fetchSectors } from "../pdv-api";
import type { CatalogItem, CatalogItemListResponse, SalePaymentMethod } from "../types";
import { NO_SECTOR_VALUE } from "./pdv-sale-constants";
import {
  calculateTotals,
  createSaleLine,
  getStockValidationMessage,
  isEditableTarget,
  parseDecimal,
  type ClientOption,
  type SaleLine,
} from "./pdv-sale-utils";
import { useToast } from "@/components/ui/toast";

type UsePdvSaleOptions = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;
};

export function usePdvSale({ open, defaultResponsible, onClose }: UsePdvSaleOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
  const [lastSale, setLastSale] = useState<{ id: string; code: number } | null>(null);
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
      queryClient.setQueriesData<CatalogItemListResponse>(
        { queryKey: ["pdv-catalog-items"] },
        (current) => {
          if (!current || current.items.some((catalogItem) => catalogItem.id === item.id)) {
            return current;
          }

          return {
            ...current,
            total: current.total + 1,
            items: [item, ...current.items].slice(0, current.pageSize),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      setSelectedProduct(item);
      setProductSearch(item.name);
      setUnitPrice(String(item.unitPrice));
      setLocalError(null);
      toast({
        title: "Produto cadastrado",
        description: "O item foi adicionado ao catalogo.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel cadastrar o produto.";
      setLocalError(message);
      toast({
        title: "Erro ao cadastrar produto",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetDraft = useCallback((options?: { keepLastSale?: boolean }) => {
    setLines([]);
    setClientSearch("");
    setSelectedClient(null);
    setProductSearch("");
    setSelectedProduct(null);
    setQuantity("1");
    setUnitPrice("");
    setDiscountPercent("0");
    setLocalError(null);
    setSuccessMessage(null);
    if (!options?.keepLastSale) {
      setLastSale(null);
    }
  }, []);

  const saleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      resetDraft({ keepLastSale: true });
      setLastSale({ id: sale.id, code: sale.code });
      setSuccessMessage(`Venda ${sale.code} guardada com sucesso.`);
      toast({
        title: "Venda registrada",
        description: `Venda ${sale.code} guardada com sucesso.`,
        variant: "success",
      });
      requestAnimationFrame(() => productInputRef.current?.focus());
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erro ao guardar venda.";
      setLocalError(message);
      toast({
        title: "Erro ao guardar venda",
        description: message,
        variant: "destructive",
      });
    },
  });

  const totals = useMemo(() => calculateTotals(lines), [lines]);
  const clientOptions = useMemo(() => clientsQuery.data?.items ?? [], [clientsQuery.data?.items]);
  const productOptions = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => productInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const selectClient = useCallback((client: ClientOption) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setClientListOpen(false);
    productInputRef.current?.focus();
  }, []);

  const selectProduct = useCallback((item: CatalogItem) => {
    setSelectedProduct(item);
    setProductSearch(item.name);
    setUnitPrice(String(item.unitPrice));
    setProductListOpen(false);
    quantityInputRef.current?.focus();
  }, []);

  const addCatalogItem = useCallback(() => {
    const name = productSearch.trim();
    const price = parseDecimal(unitPrice);

    if (!name) {
      setLocalError("Digite o nome do produto ou servico.");
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
  }, [createCatalogMutation, productSearch, unitPrice]);

  const addLine = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedProduct) {
        setLocalError("Selecione um produto/servico cadastrado ou cadastre o item antes de incluir.");
        return;
      }

      const parsedQuantity = parseDecimal(quantity);
      const parsedUnitPrice = parseDecimal(unitPrice);
      const parsedDiscount = parseDecimal(discountPercent);

      if (parsedQuantity <= 0) {
        setLocalError("Quantidade deve ser maior que zero.");
        return;
      }

      if (parsedUnitPrice < 0) {
        setLocalError("Valor unitario invalido.");
        return;
      }

      if (parsedDiscount < 0 || parsedDiscount > 100) {
        setLocalError("Desconto deve estar entre 0 e 100%.");
        return;
      }

      const stockValidationMessage = getStockValidationMessage(
        selectedProduct,
        parsedQuantity,
        lines
      );

      if (stockValidationMessage) {
        setLocalError(stockValidationMessage);
        return;
      }

      setLines((current) => [
        ...current,
        createSaleLine({
          product: selectedProduct,
          quantity: parsedQuantity,
          unitPrice: parsedUnitPrice,
          discountPercent: parsedDiscount,
        }),
      ]);
      setProductSearch("");
      setSelectedProduct(null);
      setQuantity("1");
      setUnitPrice("");
      setDiscountPercent("0");
      setLocalError(null);
      setSuccessMessage(null);
      requestAnimationFrame(() => productInputRef.current?.focus());
    },
    [discountPercent, lines, quantity, selectedProduct, unitPrice]
  );

  const removeLine = useCallback((lineId: string) => {
    setLines((current) => current.filter((item) => item.localId !== lineId));
  }, []);

  const saveSale = useCallback(() => {
    if (lines.length === 0) {
      setLocalError("Inclua pelo menos um item na venda.");
      return;
    }

    if (!responsible.trim()) {
      setLocalError("Informe o funcionario responsavel pela venda.");
      return;
    }

    saleMutation.mutate({
      clientId: selectedClient?.id ?? null,
      sectorId: sectorId === NO_SECTOR_VALUE ? null : sectorId,
      responsible: responsible.trim(),
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

  const clearSale = useCallback(() => {
    if (lines.length > 0 && !window.confirm("Descartar os itens desta venda?")) {
      return;
    }

    resetDraft();
    requestAnimationFrame(() => productInputRef.current?.focus());
  }, [lines.length, resetDraft]);

  const close = useCallback(() => {
    if (lines.length > 0 && !window.confirm("Fechar o PDV e descartar a venda em andamento?")) {
      return;
    }

    resetDraft();
    onClose();
  }, [lines.length, onClose, resetDraft]);

  const openSalesList = useCallback(() => {
    if (lines.length > 0 && !window.confirm("Ir para a lista de vendas e descartar a venda em andamento?")) {
      return;
    }

    resetDraft();
    onClose();
    router.push("/pdv/vendas");
  }, [lines.length, onClose, resetDraft, router]);

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
        close();
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
        saveSale();
        return;
      }

      if (event.key === "Delete" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setLines((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [close, open, saveSale]);

  const handleClientSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
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
        const highlightedClient =
          clientOptions[Math.min(clientHighlightIndex, clientOptions.length - 1)];
        if (highlightedClient) {
          selectClient(highlightedClient);
        }
      }
    },
    [clientHighlightIndex, clientListOpen, clientOptions, selectClient, selectedClient]
  );

  const handleProductSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
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
          selectProduct(highlightedProduct);
        }
      }
    },
    [productHighlightIndex, productListOpen, productOptions, selectProduct, selectedProduct]
  );

  return {
    refs: {
      clientInputRef,
      paymentTriggerRef,
      productInputRef,
      quantityInputRef,
      unitPriceInputRef,
    },
    queries: {
      clientsQuery,
      productsQuery,
      sectorsQuery,
    },
    mutations: {
      createCatalogMutation,
      saleMutation,
    },
    state: {
      clientHighlightIndex,
      clientListOpen,
      clientOptions,
      clientSearch,
      discountPercent,
      lines,
      localError,
      paymentMethod,
      productHighlightIndex,
      productListOpen,
      productOptions,
      productSearch,
      quantity,
      responsible,
      sectorId,
      selectedClient,
      selectedProduct,
      successMessage,
      totals,
      unitPrice,
      lastSale,
    },
    actions: {
      addCatalogItem,
      addLine,
      clearSale,
      clearLastSale: () => setLastSale(null),
      close,
      handleClientSearchKeyDown,
      handleProductSearchKeyDown,
      openSalesList,
      removeLine,
      saveSale,
      selectClient,
      selectProduct,
      setClientHighlightIndex,
      setClientListOpen,
      setClientSearch,
      setDiscountPercent,
      setPaymentMethod,
      setProductHighlightIndex,
      setProductListOpen,
      setProductSearch,
      setQuantity,
      setResponsible,
      setSectorId,
      setSelectedClient,
      setSelectedProduct,
      setUnitPrice,
    },
  };
}

export type PdvSaleController = ReturnType<typeof usePdvSale>;
