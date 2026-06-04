"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchClients } from "@/modules/client/api/client.service";
import { pdvKeys } from "../api/pdv.keys";
import {
  createCatalogItem,
  createSale,
  fetchCatalogItems,
  fetchServiceOrderPdv,
  payServiceOrderPdv,
} from "../api/pdv.service";
import type {
  CatalogItem,
  CatalogItemListResponse,
  SalePaymentPayload,
  SalePaymentMethod,
} from "../types/pdv.types";
import {
  calculateTotals,
  createSaleLine,
  getStockValidationMessage,
  isEditableTarget,
  maskCurrencyInput,
  maskPercentInput,
  parseDecimal,
  type ClientOption,
  type SaleLine,
} from "../utils/pdv-sale-utils";
import { useToast } from "@/components/ui/toast";

type PdvMode = "PDV" | "SERVICE_ORDER";

type UsePdvSaleOptions = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;
  mode?: PdvMode;
  serviceOrderId?: string;
};

type PaymentLine = {
  localId: string;
  paymentMethod: SalePaymentMethod;
  amount: string;
  feeAmount: string;
};

function createPaymentLine(
  paymentMethod: SalePaymentMethod = "DINHEIRO",
  amount = "",
  feeAmount = "0"
): PaymentLine {
  return {
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    paymentMethod,
    amount: amount ? maskCurrencyInput(amount) : "",
    feeAmount: maskCurrencyInput(feeAmount),
  };
}

function toCurrencyNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function toCentsInput(value: number) {
  return String(Math.round(toCurrencyNumber(value) * 100));
}

function calculateDiscountPercent(
  quantity: number,
  unitPrice: number,
  discountValue: number,
) {
  const subtotal = quantity * unitPrice;

  if (subtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  return Number(((discountValue / subtotal) * 100).toFixed(2));
}

function getTotalsAmount(totals: unknown) {
  const record = totals as Record<string, unknown>;

  return toCurrencyNumber(
    record.total ??
      record.totalAmount ??
      record.netTotal ??
      record.grandTotal ??
      0
  );
}

function normalizePaymentLines(
  paymentLines: PaymentLine[],
  fallbackPaymentMethod: SalePaymentMethod,
  fallbackAmount: number
): SalePaymentPayload[] {
  const validPayments = paymentLines
    .map((payment) => {
      const amount = toCurrencyNumber(parseDecimal(payment.amount));
      const feeAmount = toCurrencyNumber(parseDecimal(payment.feeAmount));

      return {
        paymentMethod: payment.paymentMethod,
        amount,
        feeAmount,
      };
    })
    .filter((payment) => payment.amount > 0);

  if (validPayments.length > 0) {
    return validPayments;
  }

  return [
    {
      paymentMethod: fallbackPaymentMethod,
      amount: fallbackAmount,
      feeAmount: 0,
    },
  ];
}

function sumPaymentsAmount(payments: SalePaymentPayload[]) {
  return toCurrencyNumber(
    payments.reduce((acc, payment) => acc + payment.amount, 0)
  );
}

function sumPaymentsFee(payments: SalePaymentPayload[]) {
  return toCurrencyNumber(
    payments.reduce((acc, payment) => acc + payment.feeAmount, 0)
  );
}

export function usePdvSale({
  open,
  defaultResponsible,
  onClose,
  mode = "PDV",
  serviceOrderId,
}: UsePdvSaleOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isServiceOrderMode = mode === "SERVICE_ORDER" && Boolean(serviceOrderId);

  const clientInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitPriceInputRef = useRef<HTMLInputElement>(null);
  const paymentTriggerRef = useRef<HTMLButtonElement>(null);

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null
  );
  const [responsible, setResponsible] = useState(defaultResponsible);
  const [paymentMethod, setPaymentMethodState] =
    useState<SalePaymentMethod>("DINHEIRO");
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    createPaymentLine("DINHEIRO"),
  ]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(
    null
  );
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<{ id: string; code: number } | null>(
    null
  );
  const [clientHighlightIndex, setClientHighlightIndex] = useState(0);
  const [productHighlightIndex, setProductHighlightIndex] = useState(0);
  const [clientListOpen, setClientListOpen] = useState(false);
  const [productListOpen, setProductListOpen] = useState(false);
  const [serviceOrderLoading, setServiceOrderLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["pdv-clients", clientSearch],
    queryFn: () =>
      fetchClients({
        page: 1,
        pageSize: 6,
        search: clientSearch,
        status: "ATIVO",
      }),
    enabled: open && !isServiceOrderMode,
    staleTime: 30_000,
  });

  const productsQuery = useQuery({
    queryKey: pdvKeys.catalogItemsList({
      page: 1,
      pageSize: 6,
      search: productSearch,
    }),
    queryFn: () =>
      fetchCatalogItems({
        page: 1,
        pageSize: 6,
        search: productSearch,
      }),
    enabled: open && !isServiceOrderMode,
    staleTime: 30_000,
  });

  const createCatalogMutation = useMutation({
    mutationFn: createCatalogItem,
    onSuccess: (item) => {
      queryClient.setQueriesData<CatalogItemListResponse>(
        { queryKey: pdvKeys.catalogItems() },
        (current) => {
          if (
            !current ||
            current.items.some((catalogItem) => catalogItem.id === item.id)
          ) {
            return current;
          }

          return {
            ...current,
            total: current.total + 1,
            items: [item, ...current.items].slice(0, current.pageSize),
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: pdvKeys.catalogItems() });

      setSelectedProduct(item);
      setProductSearch(item.name);
      setUnitPrice(maskCurrencyInput(toCentsInput(parseDecimal(String(item.unitPrice)))));
      setLocalError(null);

      toast({
        title: "Produto cadastrado",
        description: "O item foi adicionado ao catalogo.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar o produto.";

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
    setPaymentMethodState("DINHEIRO");
    setPaymentLines([createPaymentLine("DINHEIRO")]);
    setLocalError(null);
    setSuccessMessage(null);
    setServiceOrderLoading(false);
    setPaymentDialogOpen(false);

    if (!options?.keepLastSale) {
      setLastSale(null);
    }
  }, []);

  const saleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: pdvKeys.sales() });
      queryClient.invalidateQueries({ queryKey: pdvKeys.catalogItems() });

      resetDraft({ keepLastSale: true });
      setPaymentDialogOpen(false);
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
      const message =
        error instanceof Error ? error.message : "Erro ao guardar venda.";

      setLocalError(message);

      toast({
        title: "Erro ao guardar venda",
        description: message,
        variant: "destructive",
      });
    },
  });

  const serviceOrderPaymentMutation = useMutation({
    mutationFn: payServiceOrderPdv,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pdvKeys.sales() });
      queryClient.invalidateQueries({ queryKey: pdvKeys.catalogItems() });
      queryClient.invalidateQueries({ queryKey: pdvKeys.serviceOrders() });

      resetDraft({ keepLastSale: true });
      setPaymentDialogOpen(false);
      setLastSale({
        id: result.sale.id,
        code: result.sale.code,
      });

      setSuccessMessage("Pagamento da ordem de serviço registrado com sucesso.");

      toast({
        title: "Ordem de serviço paga",
        description: "Pagamento registrado com sucesso.",
        variant: "success",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao efetuar pagamento da ordem de serviço.";

      setLocalError(message);

      toast({
        title: "Erro ao efetuar pagamento",
        description: message,
        variant: "destructive",
      });
    },
  });

  const totals = useMemo(() => calculateTotals(lines), [lines]);

  const saleTotal = useMemo(() => getTotalsAmount(totals), [totals]);

  const paymentsPayload = useMemo(
    () =>
      normalizePaymentLines(
        paymentLines,
        paymentLines[0]?.paymentMethod ?? paymentMethod,
        saleTotal
      ),
    [paymentLines, paymentMethod, saleTotal]
  );

  const paymentTotal = useMemo(
    () => sumPaymentsAmount(paymentsPayload),
    [paymentsPayload]
  );

  const paymentFeeTotal = useMemo(
    () => sumPaymentsFee(paymentsPayload),
    [paymentsPayload]
  );

  const expectedPaymentTotal = useMemo(
    () => toCurrencyNumber(saleTotal + paymentFeeTotal),
    [paymentFeeTotal, saleTotal]
  );

  const paymentDifference = useMemo(
    () => toCurrencyNumber(expectedPaymentTotal - paymentTotal),
    [expectedPaymentTotal, paymentTotal]
  );

  const clientOptions = useMemo(
    () => clientsQuery.data?.items ?? [],
    [clientsQuery.data?.items]
  );

  const productOptions = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items]
  );

  const setPaymentMethod = useCallback((method: SalePaymentMethod) => {
    setPaymentMethodState(method);
    setPaymentLines((current) => {
      if (current.length !== 1) {
        return current;
      }

      return [
        {
          ...current[0],
          paymentMethod: method,
        },
      ];
    });
  }, []);

  const addPaymentLine = useCallback(() => {
    setPaymentLines((current) => [...current, createPaymentLine("PIX")]);
  }, []);

  const removePaymentLine = useCallback((lineId: string) => {
    setPaymentLines((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((line) => line.localId !== lineId);
    });
  }, []);

  const updateUnitPrice = useCallback((value: string) => {
    setUnitPrice(maskCurrencyInput(value));
  }, []);

  const updateDiscountPercent = useCallback((value: string) => {
    setDiscountPercent(maskPercentInput(value));
  }, []);

  const updatePaymentLine = useCallback(
    (
      lineId: string,
      field: "paymentMethod" | "amount" | "feeAmount",
      value: string
    ) => {
      const nextValue =
        field === "paymentMethod" ? value : maskCurrencyInput(value);

      setPaymentLines((current) => {
        const updated = current.map((line) => {
          if (line.localId !== lineId) {
            return line;
          }

          if (field !== "feeAmount") {
            return {
              ...line,
              [field]: nextValue,
            };
          }

          const currentAmount = toCurrencyNumber(parseDecimal(line.amount));
          const currentFee = toCurrencyNumber(parseDecimal(line.feeAmount));
          const nextFee = toCurrencyNumber(parseDecimal(nextValue));
          const nextAmount =
            currentAmount > 0
              ? toCurrencyNumber(currentAmount - currentFee + nextFee)
              : 0;

          return {
            ...line,
            feeAmount: nextValue,
            amount:
              nextAmount > 0
                ? maskCurrencyInput(toCentsInput(nextAmount))
                : line.amount,
          };
        });

        if (field === "paymentMethod" && updated[0]?.localId === lineId) {
          setPaymentMethodState(value as SalePaymentMethod);
        }

        return updated;
      });
    },
    []
  );

  const fillSinglePaymentWithTotal = useCallback(() => {
    const feeAmount = paymentFeeTotal;

    setPaymentLines((current) => [
      createPaymentLine(
        current[0]?.paymentMethod ?? paymentMethod,
        toCentsInput(saleTotal + feeAmount),
        toCentsInput(feeAmount)
      ),
    ]);
  }, [paymentFeeTotal, paymentMethod, saleTotal]);

  const openPaymentDialog = useCallback(() => {
    setPaymentDialogOpen(true);
    requestAnimationFrame(() => paymentTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (isServiceOrderMode) {
        paymentTriggerRef.current?.focus();
        return;
      }

      productInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isServiceOrderMode, open]);

  useEffect(() => {
    if (!open || !isServiceOrderMode || !serviceOrderId) {
      return;
    }

    let ignore = false;

    async function loadServiceOrder() {
      try {
        setServiceOrderLoading(true);
        setLocalError(null);
        setSuccessMessage("Carregando dados da ordem de serviço...");
        setLines([]);

        const serviceOrder = await fetchServiceOrderPdv(serviceOrderId!);

        if (ignore) {
          return;
        }

        const mappedLines = serviceOrder.items.map((item) => {
          const quantityValue = Number(item.quantity);
          const unitPriceValue = Number(item.unitPrice);
          const discountValue = Number(item.discount ?? 0);

          const catalogItem = {
            id: item.catalogItemId ?? item.id,
            code: item.code ?? null,
            name: item.catalogItem?.name ?? item.name,
            type: item.type,
            unitPrice: unitPriceValue,
            stockCurrent: item.stockCurrent ?? item.catalogItem?.stockCurrent ?? null,
          } as unknown as CatalogItem;

          return createSaleLine({
            product: catalogItem,
            quantity: Number.isFinite(quantityValue) ? quantityValue : 1,
            unitPrice: Number.isFinite(unitPriceValue) ? unitPriceValue : 0,
            discountPercent:
              Number.isFinite(discountValue) &&
              Number.isFinite(quantityValue) &&
              Number.isFinite(unitPriceValue)
                ? calculateDiscountPercent(
                    quantityValue,
                    unitPriceValue,
                    discountValue
                  )
                : 0,
          });
        });

        const serviceOrderTotal = toCurrencyNumber(serviceOrder.total);

        setLines(mappedLines);
        setSelectedClient(serviceOrder.client ?? null);
        setClientSearch(serviceOrder.client?.name ?? "");
        setResponsible(defaultResponsible);
        setPaymentMethodState("DINHEIRO");
        setPaymentLines([
          createPaymentLine(
            "DINHEIRO",
            serviceOrderTotal > 0 ? toCentsInput(serviceOrderTotal) : "",
            "0"
          ),
        ]);
        setProductSearch("");
        setSelectedProduct(null);
        setQuantity("1");
        setUnitPrice("");
        setDiscountPercent("0");
        setSuccessMessage(null);
        setLocalError(null);
      } catch (error) {
        if (ignore) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Erro ao carregar ordem de serviço.";

        setLocalError(message);

        toast({
          title: "Erro ao carregar OS",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!ignore) {
          setServiceOrderLoading(false);
        }
      }
    }

    loadServiceOrder();

    return () => {
      ignore = true;
    };
  }, [defaultResponsible, isServiceOrderMode, open, serviceOrderId, toast]);

  const selectClient = useCallback((client: ClientOption) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setClientListOpen(false);
    productInputRef.current?.focus();
  }, []);

  const selectProduct = useCallback((item: CatalogItem) => {
    setSelectedProduct(item);
    setProductSearch(item.name);
    setUnitPrice(maskCurrencyInput(toCentsInput(parseDecimal(String(item.unitPrice)))));
    setProductListOpen(false);
    quantityInputRef.current?.focus();
  }, []);

  const addCatalogItem = useCallback(() => {
    if (isServiceOrderMode) {
      return;
    }

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
  }, [createCatalogMutation, isServiceOrderMode, productSearch, unitPrice]);

  const addLine = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isServiceOrderMode) {
        return;
      }

      if (!selectedProduct) {
        setLocalError(
          "Selecione um produto/servico cadastrado ou cadastre o item antes de incluir."
        );
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
    [
      discountPercent,
      isServiceOrderMode,
      lines,
      quantity,
      selectedProduct,
      unitPrice,
    ]
  );

  const removeLine = useCallback(
    (lineId: string) => {
      if (isServiceOrderMode) {
        return;
      }

      setLines((current) => current.filter((item) => item.localId !== lineId));
    },
    [isServiceOrderMode]
  );

  const saveSale = useCallback(() => {
    if (lines.length === 0) {
      setLocalError(
        isServiceOrderMode
          ? "Nenhum item foi encontrado para esta ordem de serviço."
          : "Inclua pelo menos um item na venda."
      );
      return;
    }

    if (paymentsPayload.length === 0) {
      setLocalError("Informe pelo menos uma forma de pagamento.");
      return;
    }

    if (Math.abs(paymentDifference) > 0.009) {
      setLocalError(
        `Total do pagamento inválido. Falta/ sobra R$ ${Math.abs(
          paymentDifference
        ).toFixed(2)}.`
      );
      return;
    }

    if (isServiceOrderMode) {
      if (!serviceOrderId) {
        setLocalError("Ordem de serviço inválida.");
        return;
      }

      serviceOrderPaymentMutation.mutate({
        serviceOrderId,
        payments: paymentsPayload,
      });

      return;
    }

    if (!responsible.trim()) {
      setLocalError("Informe o funcionario responsavel pela venda.");
      return;
    }

    const payload = {
      clientId: selectedClient?.id ?? null,
      sectorId: null,
      responsible: responsible.trim(),
      paymentMethod: paymentsPayload[0]?.paymentMethod ?? paymentMethod,
      payments: paymentsPayload,
      notes: null,
      items: lines.map((line) => ({
        catalogItemId: line.catalogItemId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
      })),
    } as Parameters<typeof createSale>[0] & {
      payments: SalePaymentPayload[];
    };

    saleMutation.mutate(payload);
  }, [
    isServiceOrderMode,
    lines,
    paymentDifference,
    paymentMethod,
    paymentsPayload,
    responsible,
    saleMutation,
    selectedClient?.id,
    serviceOrderId,
    serviceOrderPaymentMutation,
  ]);

  const clearSale = useCallback(() => {
    if (isServiceOrderMode) {
      return;
    }

    if (lines.length > 0 && !window.confirm("Descartar os itens desta venda?")) {
      return;
    }

    resetDraft();
    requestAnimationFrame(() => productInputRef.current?.focus());
  }, [isServiceOrderMode, lines.length, resetDraft]);

  const close = useCallback(() => {
    if (!isServiceOrderMode && lines.length > 0) {
      if (!window.confirm("Fechar o PDV e descartar a venda em andamento?")) {
        return;
      }
    }

    resetDraft();
    onClose();
  }, [isServiceOrderMode, lines.length, onClose, resetDraft]);

  const openSalesList = useCallback(() => {
    if (!isServiceOrderMode && lines.length > 0) {
      if (
        !window.confirm(
          "Ir para a lista de vendas e descartar a venda em andamento?"
        )
      ) {
        return;
      }
    }

    resetDraft();
    onClose();
    router.push("/pdv/vendas");
  }, [isServiceOrderMode, lines.length, onClose, resetDraft, router]);

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

      if (event.key === "F2" && !isServiceOrderMode) {
        event.preventDefault();
        productInputRef.current?.focus();
        return;
      }

      if (event.key === "F3" && !isServiceOrderMode) {
        event.preventDefault();
        clientInputRef.current?.focus();
        return;
      }

      if (event.key === "F4" && !isServiceOrderMode) {
        event.preventDefault();
        quantityInputRef.current?.focus();
        return;
      }

      if (event.key === "F5" && !isServiceOrderMode) {
        event.preventDefault();
        unitPriceInputRef.current?.focus();
        return;
      }

      if (event.key === "F6") {
        event.preventDefault();
        openPaymentDialog();
        return;
      }

      if (event.key === "F8") {
        event.preventDefault();
        openPaymentDialog();
        return;
      }

      if (
        event.key === "Delete" &&
        !isEditableTarget(event.target) &&
        !isServiceOrderMode
      ) {
        event.preventDefault();
        setLines((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [close, isServiceOrderMode, open, openPaymentDialog]);

  const handleClientSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (isServiceOrderMode || selectedClient || clientOptions.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setClientListOpen(true);
        setClientHighlightIndex(
          (current) => (current + 1) % clientOptions.length
        );
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
    [
      clientHighlightIndex,
      clientListOpen,
      clientOptions,
      isServiceOrderMode,
      selectClient,
      selectedClient,
    ]
  );

  const handleProductSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (isServiceOrderMode || selectedProduct || productOptions.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setProductListOpen(true);
        setProductHighlightIndex(
          (current) => (current + 1) % productOptions.length
        );
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
          productOptions[
            Math.min(productHighlightIndex, productOptions.length - 1)
          ];

        if (highlightedProduct) {
          selectProduct(highlightedProduct);
        }
      }
    },
    [
      isServiceOrderMode,
      productHighlightIndex,
      productListOpen,
      productOptions,
      selectProduct,
      selectedProduct,
    ]
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
    },
    mutations: {
      createCatalogMutation,
      saleMutation,
      serviceOrderPaymentMutation,
    },
    state: {
      clientHighlightIndex,
      clientListOpen,
      clientOptions,
      clientSearch,
      discountPercent,
      expectedPaymentTotal,
      isServiceOrderMode,
      lines,
      localError,
      paymentDifference,
      paymentFeeTotal,
      paymentDialogOpen,
      paymentLines,
      paymentMethod,
      paymentsPayload,
      paymentTotal,
      productHighlightIndex,
      productListOpen,
      productOptions,
      productSearch,
      quantity,
      responsible,
      saleTotal,
      selectedClient,
      selectedProduct,
      serviceOrderLoading,
      successMessage,
      totals,
      unitPrice,
      lastSale,
    },
    actions: {
      addCatalogItem,
      addLine,
      addPaymentLine,
      clearSale,
      clearLastSale: () => setLastSale(null),
      close,
      fillSinglePaymentWithTotal,
      handleClientSearchKeyDown,
      handleProductSearchKeyDown,
      openPaymentDialog,
      openSalesList,
      removeLine,
      removePaymentLine,
      saveSale,
      selectClient,
      selectProduct,
      setClientHighlightIndex,
      setClientListOpen,
      setClientSearch,
      setDiscountPercent: updateDiscountPercent,
      setPaymentMethod,
      setPaymentLines,
      setPaymentDialogOpen,
      setProductHighlightIndex,
      setProductListOpen,
      setProductSearch,
      setQuantity,
      setResponsible,
      setSelectedClient,
      setSelectedProduct,
      setUnitPrice: updateUnitPrice,
      updatePaymentLine,
    },
  };
}

export type PdvSaleController = ReturnType<typeof usePdvSale>;
