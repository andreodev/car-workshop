"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Check,
  Download,
  Edit2,
  Eye,
  FolderTree,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  createCashMovement,
  createFinancialAccount,
  createFinancialCategory,
  deleteCashMovement,
  deleteFinancialAccount,
  deleteFinancialCategory,
  fetchCashMovements,
  fetchFinancialAccounts,
  fetchFinancialCategories,
  fetchFinancialOpenSummary,
  updateCashMovement,
  updateFinancialAccount,
  updateFinancialCategory,
  updateFinancialCategoryActive,
} from "./finance-api";
import {
  cashMovementTypeOptions,
  financialCategoryTypeOptions,
  financialPaymentMethodOptions,
  financialStatusOptions,
  financialTypeOptions,
  getCashMovementTypeLabel,
  getFinancialCategoryTypeLabel,
  getFinancialStatusLabel,
  getFinancialTypeLabel,
  getPaymentMethodLabel,
} from "./status";
import type {
  CashMovement,
  CashMovementFormValues,
  CashMovementType,
  FinancialAccount,
  FinancialAccountFormValues,
  FinancialAccountStatus,
  FinancialAccountType,
  FinancialCategory,
  FinancialCategoryFormValues,
  FinancialCategoryType,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import Header from "@/components/ui/header";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const PAGE_SIZE = 10;
const NO_CATEGORY = "SEM_CATEGORIA";
const NO_PAYMENT_METHOD = "SEM_FORMA";

const cashChartConfig = {
  amount: {
    label: "Valor",
  },
  entries: {
    label: "Entradas",
    color: "#047857",
  },
  exits: {
    label: "Saídas",
    color: "#be123c",
  },
} satisfies ChartConfig;

type StatementKind = "CONTA" | "CAIXA" | "CATEGORIA";
type StatementKindFilter = "TODOS" | StatementKind;

type AccountTypeFilter = FinancialAccountType | "TODOS";
type AccountStatusFilter = FinancialAccountStatus | "TODOS";
type MovementTypeFilter = CashMovementType | "TODOS";
type CategoryTypeFilter = FinancialCategoryType | "TODOS";
type ActiveFilter = "TODOS" | "ATIVAS" | "INATIVAS";

type StatementRow = {
  id: string;
  kind: StatementKind;
  code: string | number;
  description: string;
  typeLabel: string;
  category: string;
  date: string | null;
  paymentMethod: string;
  amount: string | number | null;
  status: ReactNode;
  notes: string;
  actions: ReactNode;
  sortDate: string | null;
  sortUpdatedAt: string | null;
  account?: FinancialAccount;
  movement?: CashMovement;
  categoryRecord?: FinancialCategory;
};

const emptyAccountForm: FinancialAccountFormValues = {
  type: "RECEBER",
  status: "ABERTA",
  description: "",
  clientId: "",
  counterparty: "",
  category: "",
  documentNumber: "",
  dueDate: todayInputValue(),
  paymentDate: "",
  amount: "",
  paidAmount: "",
  paymentMethod: "",
  notes: "",
};

const emptyMovementForm: CashMovementFormValues = {
  type: "ENTRADA",
  categoryId: "",
  description: "",
  movementDate: todayInputValue(),
  amount: "",
  paymentMethod: "",
  documentNumber: "",
  notes: "",
};

const emptyCategoryForm: FinancialCategoryFormValues = {
  name: "",
  type: "AMBOS",
  active: true,
  notes: "",
};

function todayInputValue() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function lastDaysRange(days: number) {
  const end = new Date();
  const start = new Date();

  start.setDate(end.getDate() - Math.max(days - 1, 0));

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatCurrency(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatMoneyInput(value: string | number | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);

  if (!digits) {
    return "";
  }

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));

  return Number.isFinite(parsed) ? String(parsed) : "";
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value / 100 : 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function getAccountStatementDate(account: FinancialAccount) {
  if (account.status === "PAGA") {
    return account.paymentDate ?? account.dueDate;
  }

  return account.dueDate;
}

function accountToForm(account: FinancialAccount): FinancialAccountFormValues {
  return {
    type: account.type,
    status: account.status,
    description: account.description,
    clientId: account.clientId ?? "",
    counterparty: account.counterparty ?? "",
    category: account.category ?? "",
    documentNumber: account.documentNumber ?? "",
    dueDate: toDateInput(account.dueDate),
    paymentDate: toDateInput(account.paymentDate),
    amount: String(account.amount ?? ""),
    paidAmount: account.paidAmount ? String(account.paidAmount) : "",
    paymentMethod: account.paymentMethod ?? "",
    notes: account.notes ?? "",
  };
}

function movementToForm(movement: CashMovement): CashMovementFormValues {
  return {
    type: movement.type,
    categoryId: movement.categoryId ?? "",
    description: movement.description,
    movementDate: toDateInput(movement.movementDate),
    amount: formatMoneyInput(movement.amount),
    paymentMethod: movement.paymentMethod ?? "",
    documentNumber: movement.documentNumber ?? "",
    notes: movement.notes ?? "",
  };
}

function categoryToForm(category: FinancialCategory): FinancialCategoryFormValues {
  return {
    name: category.name,
    type: category.type,
    active: category.active,
    notes: category.notes ?? "",
  };
}

function statusBadge(status: FinancialAccountStatus) {
  const className =
    status === "PAGA"
      ? "bg-emerald-600/10 text-emerald-700"
      : status === "VENCIDA"
        ? "bg-amber-500/10 text-amber-700"
        : status === "CANCELADA"
          ? "bg-destructive/10 text-destructive"
          : "bg-sky-600/10 text-sky-700";

  return <Badge className={className}>{getFinancialStatusLabel(status)}</Badge>;
}

export default function FinancialPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statementKind, setStatementKind] = useState<StatementKindFilter>("CAIXA");
  const [statementSearchInput, setStatementSearchInput] = useState("");
  const [statementSearch, setStatementSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [accountType, setAccountType] = useState<AccountTypeFilter>("TODOS");
  const [accountStatus, setAccountStatus] = useState<AccountStatusFilter>("TODOS");
  const [movementType, setMovementType] = useState<MovementTypeFilter>("TODOS");
  const [categoryType] = useState<CategoryTypeFilter>("TODOS");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("TODOS");

  const [from, setFrom] = useState(() => todayInputValue());
  const [to, setTo] = useState(() => todayInputValue());

  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [movementSheetOpen, setMovementSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FinancialCategory | null>(null);
  const [detailKind, setDetailKind] = useState<StatementKind | null>(null);

  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const [errorMessage, setErrorMessage] = useState("");

  const accountsQuery = useQuery({
    queryKey: [
      "financial-accounts",
      { accountType, accountStatus, from, to, currentPage, statementSearch },
    ],
    queryFn: () =>
      fetchFinancialAccounts({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: statementSearch,
        type: accountType,
        status: accountStatus,
        from,
        to,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const openAccountsQuery = useQuery({
    queryKey: ["financial-open-summary"],
    queryFn: fetchFinancialOpenSummary,
    staleTime: 30_000,
  });

  const movementsQuery = useQuery({
    queryKey: ["cash-movements", { movementType, from, to, currentPage, statementSearch }],
    queryFn: () =>
      fetchCashMovements({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: statementSearch,
        type: movementType,
        from,
        to,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: [
      "financial-categories",
      { categoryType, activeFilter, currentPage, statementSearch },
    ],
    queryFn: () =>
      fetchFinancialCategories({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: statementSearch,
        type: categoryType,
        active:
          activeFilter === "TODOS"
            ? undefined
            : activeFilter === "ATIVAS",
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const activeCategoriesQuery = useQuery({
    queryKey: ["financial-categories-options"],
    queryFn: () => fetchFinancialCategories({ pageSize: 100, active: true }),
    staleTime: 60_000,
  });

  const accountTotals = useMemo(() => {
    const summary = accountsQuery.data?.summary ?? [];

    return {
      received: sumAccountPaid(summary, "RECEBER", "PAGA"),
      paid: sumAccountPaid(summary, "PAGAR", "PAGA"),
    };
  }, [accountsQuery.data]);

  const openAccountTotals = useMemo(() => {
    const summary = openAccountsQuery.data;

    return {
      receivableOpen: summary?.receivableOpen ?? 0,
      payableOpen: summary?.payableOpen ?? 0,
      accountReceivableOpen: summary?.accountReceivableOpen ?? 0,
      activeServiceOrdersReceivable: summary?.activeServiceOrdersReceivable ?? 0,
      activeServiceOrdersCount: summary?.activeServiceOrdersCount ?? 0,
    };
  }, [openAccountsQuery.data]);

  const cashTotals = useMemo(() => {
    const summary = movementsQuery.data?.summary ?? [];
    const entries = sumCash(summary, "ENTRADA");
    const exits = sumCash(summary, "SAIDA");

    return {
      entries,
      exits,
      balance: entries - exits,
    };
  }, [movementsQuery.data]);

  const realizedMargin =
    cashTotals.entries > 0 ? (cashTotals.balance / cashTotals.entries) * 100 : 0;
  const openBalance = openAccountTotals.receivableOpen - openAccountTotals.payableOpen;
  const projectedBalance = cashTotals.balance + openBalance;
  const walletBalance = accountTotals.received - accountTotals.paid;
  const cashChartData = [
    {
      name: "Entradas",
      amount: cashTotals.entries,
      fill: "var(--color-entries)",
    },
    {
      name: "Saídas",
      amount: cashTotals.exits,
      fill: "var(--color-exits)",
    },
  ];

  const saveAccountMutation = useMutation({
    mutationFn: (payload: FinancialAccountFormValues) =>
      editingAccount
        ? updateFinancialAccount(editingAccount.id, payload)
        : createFinancialAccount(payload),
    onSuccess: () => {
      setAccountSheetOpen(false);
      setEditingAccount(null);
      setAccountForm(emptyAccountForm);
      invalidateFinancialQueries(queryClient);

      toast({
        title: editingAccount ? "Conta atualizada" : "Conta criada",
        description: "Registro salvo com sucesso.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const saveMovementMutation = useMutation({
    mutationFn: (payload: CashMovementFormValues) =>
      editingMovement
        ? updateCashMovement(editingMovement.id, payload)
        : createCashMovement(payload),
    onSuccess: () => {
      setMovementSheetOpen(false);
      setEditingMovement(null);
      setMovementForm(emptyMovementForm);
      invalidateFinancialQueries(queryClient);

      toast({
        title: editingMovement ? "Movimento atualizado" : "Movimento criado",
        description: "Registro salvo com sucesso.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (payload: FinancialCategoryFormValues) =>
      editingCategory
        ? updateFinancialCategory(editingCategory.id, payload)
        : createFinancialCategory(payload),
    onSuccess: () => {
      setCategorySheetOpen(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
      invalidateFinancialQueries(queryClient);

      toast({
        title: editingCategory ? "Categoria atualizada" : "Categoria criada",
        description: "Registro salvo com sucesso.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const categoryActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateFinancialCategoryActive(id, active),
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);

      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteFinancialAccount,
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);

      toast({
        title: "Conta removida",
        description: "O registro foi excluido.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const deleteMovementMutation = useMutation({
    mutationFn: deleteCashMovement,
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);

      toast({
        title: "Movimento removido",
        description: "O registro foi excluido.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteFinancialCategory,
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);

      toast({
        title: "Categoria removida",
        description: "O registro foi excluido.",
        variant: "success",
      });
    },
    onError: showMutationError,
  });

  const statementRows = useMemo<StatementRow[]>(() => {
    const accountRows: StatementRow[] =
      accountsQuery.data?.items.map((account) => ({
        id: `account-${account.id}`,
        kind: "CONTA",
        code: account.code,
        description: account.description,
        typeLabel: getFinancialTypeLabel(account.type),
        category: account.category ?? "-",
        date: getAccountStatementDate(account),
        paymentMethod: getPaymentMethodLabel(account.paymentMethod),
        amount: account.amount,
        status: statusBadge(account.status),
        notes: account.serviceOrder
          ? `OS #${account.serviceOrder.code}`
          : account.supplierOrder
            ? `Pedido #${account.supplierOrder.code}`
            : account.documentNumber || account.notes || "-",
        sortDate: getAccountStatementDate(account),
        sortUpdatedAt: account.updatedAt ?? account.createdAt,
        actions: (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Detalhes"
              onClick={() => openAccountDetails(account)}
            >
              <Eye className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Extrato PDF"
              onClick={() => openAccountStatementPdf(account.id)}
            >
              <Download className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Editar"
              onClick={() => openEditAccount(account)}
            >
              <Edit2 className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              title="Cancelar"
              onClick={() =>
                confirm(
                  "Cancelar esta conta? Se estiver paga, um estorno será lançado no caixa."
                ) && deleteAccountMutation.mutate(account.id)
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        account,
      })) ?? [];

    const movementRows: StatementRow[] =
      movementsQuery.data?.items.map((movement) => ({
        id: `movement-${movement.id}`,
        kind: "CAIXA",
        code: movement.code,
        description: movement.description,
        typeLabel: getCashMovementTypeLabel(movement.type),
        category: movement.category?.name ?? "-",
        date: movement.movementDate,
        paymentMethod: getPaymentMethodLabel(movement.paymentMethod),
        amount: movement.amount,
        status: (
          <Badge
            className={
              movement.type === "ENTRADA"
                ? "bg-emerald-600/10 text-emerald-700"
                : "bg-rose-600/10 text-rose-700"
            }
          >
            {getCashMovementTypeLabel(movement.type)}
          </Badge>
        ),
        notes: movement.sale
          ? `PDV #${movement.sale.code}`
          : movement.financialAccount
            ? `Conta #${movement.financialAccount.code}`
            : movement.documentNumber || movement.notes || "-",
        sortDate: movement.movementDate,
        sortUpdatedAt: movement.updatedAt ?? movement.createdAt,
        actions: (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Detalhes"
              onClick={() => openMovementDetails(movement)}
            >
              <Eye className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Extrato PDF"
              onClick={() => openMovementStatementPdf(movement.id)}
            >
              <Download className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Editar"
              onClick={() => openEditMovement(movement)}
            >
              <Edit2 className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              title={
                movement.sale || movement.financialAccount
                  ? "Estorne pela origem"
                  : "Estornar"
              }
              disabled={Boolean(movement.sale || movement.financialAccount)}
              onClick={() =>
                confirm(
                  "Estornar este movimento? Um lançamento inverso será criado no caixa."
                ) && deleteMovementMutation.mutate(movement.id)
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        movement,
      })) ?? [];

    const categoryRows: StatementRow[] =
      categoriesQuery.data?.items.map((category) => ({
        id: `category-${category.id}`,
        kind: "CATEGORIA",
        code: category.code,
        description: category.name,
        typeLabel: getFinancialCategoryTypeLabel(category.type),
        category: "-",
        date: null,
        paymentMethod: "-",
        amount: null,
        status: (
          <Badge
            variant={category.active ? "default" : "secondary"}
            className={category.active ? "bg-emerald-600/10 text-emerald-700" : ""}
          >
            {category.active ? "Ativa" : "Inativa"}
          </Badge>
        ),
        notes: category.notes ?? "-",
        sortDate: category.updatedAt ?? category.createdAt,
        sortUpdatedAt: category.updatedAt ?? category.createdAt,
        actions: (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Detalhes"
              onClick={() => openCategoryDetails(category)}
            >
              <Eye className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Editar"
              onClick={() => openEditCategory(category)}
            >
              <Edit2 className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={category.active ? "Inativar" : "Ativar"}
              onClick={() =>
                categoryActiveMutation.mutate({
                  id: category.id,
                  active: !category.active,
                })
              }
            >
              {category.active ? <X className="size-3.5" /> : <Check className="size-3.5" />}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              title="Excluir"
              onClick={() =>
                confirm("Excluir esta categoria?") &&
                deleteCategoryMutation.mutate(category.id)
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        categoryRecord: category,
      })) ?? [];

    return [...accountRows, ...movementRows, ...categoryRows]
      .filter((row) =>
        statementKind === "TODOS"
          ? row.kind !== "CATEGORIA"
          : row.kind === statementKind
      )
      .filter((row) => {
        if (!statementSearch) return true;

        const search = statementSearch.toLowerCase();

        return [
          row.code,
          row.description,
          row.typeLabel,
          row.category,
          row.paymentMethod,
          row.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        const dateA = a.sortDate ? new Date(a.sortDate).getTime() : 0;
        const dateB = b.sortDate ? new Date(b.sortDate).getTime() : 0;

        if (dateA !== dateB) {
          return dateB - dateA;
        }

        const updatedA = a.sortUpdatedAt ? new Date(a.sortUpdatedAt).getTime() : 0;
        const updatedB = b.sortUpdatedAt ? new Date(b.sortUpdatedAt).getTime() : 0;

        if (updatedA !== updatedB) {
          return updatedB - updatedA;
        }

        const codeA = Number(a.code);
        const codeB = Number(b.code);

        return (Number.isFinite(codeB) ? codeB : 0) - (Number.isFinite(codeA) ? codeA : 0);
      });
  }, [
    accountsQuery.data,
    categoryActiveMutation,
    categoriesQuery.data,
    deleteAccountMutation,
    deleteCategoryMutation,
    deleteMovementMutation,
    movementsQuery.data,
    statementKind,
    statementSearch,
  ]);

  const isLoadingStatement =
    accountsQuery.isLoading || movementsQuery.isLoading || categoriesQuery.isLoading;
  const isFetchingStatement =
    accountsQuery.isFetching || movementsQuery.isFetching || categoriesQuery.isFetching;

  function showMutationError(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.";

    setErrorMessage(message);

    toast({
      title: "Erro na operacao",
      description: message,
      variant: "destructive",
    });
  }

  function openNewAccount(type: FinancialAccountType = "RECEBER") {
    setErrorMessage("");
    setEditingAccount(null);
    setAccountForm({ ...emptyAccountForm, type });
    setAccountSheetOpen(true);
  }

  function openEditAccount(account: FinancialAccount) {
    setErrorMessage("");
    setEditingAccount(account);
    setAccountForm(accountToForm(account));
    setAccountSheetOpen(true);
  }

  function openNewMovement(type: CashMovementType = "ENTRADA") {
    setErrorMessage("");
    setEditingMovement(null);
    setMovementForm({ ...emptyMovementForm, type });
    setMovementSheetOpen(true);
  }

  function openEditMovement(movement: CashMovement) {
    setErrorMessage("");
    setEditingMovement(movement);
    setMovementForm(movementToForm(movement));
    setMovementSheetOpen(true);
  }

  function openNewCategory() {
    setErrorMessage("");
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategorySheetOpen(true);
  }

  function openEditCategory(category: FinancialCategory) {
    setErrorMessage("");
    setEditingCategory(category);
    setCategoryForm(categoryToForm(category));
    setCategorySheetOpen(true);
  }

  function openAccountDetails(account: FinancialAccount) {
    setDetailKind("CONTA");
    setSelectedAccount(account);
    setSelectedMovement(null);
    setSelectedCategory(null);
    setDetailDialogOpen(true);
  }

  function openMovementDetails(movement: CashMovement) {
    setDetailKind("CAIXA");
    setSelectedAccount(null);
    setSelectedMovement(movement);
    setSelectedCategory(null);
    setDetailDialogOpen(true);
  }

  function openCategoryDetails(category: FinancialCategory) {
    setDetailKind("CATEGORIA");
    setSelectedAccount(null);
    setSelectedMovement(null);
    setSelectedCategory(category);
    setDetailDialogOpen(true);
  }

  function shouldOpenDetails(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return true;
    }

    return !target.closest("button, a, input, select, textarea");
  }

  function handleStatementSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatementSearch(statementSearchInput.trim());
    setCurrentPage(1);
  }

  function clearStatementFilters() {
    const range = lastDaysRange(1);

    setStatementKind("CAIXA");
    setStatementSearchInput("");
    setStatementSearch("");
    setAccountType("TODOS");
    setAccountStatus("TODOS");
    setMovementType("TODOS");
    setActiveFilter("TODOS");
    setFrom(range.from);
    setTo(range.to);
    setCurrentPage(1);
  }

  function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveAccountMutation.mutate(accountForm);
  }

  function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveMovementMutation.mutate({
      ...movementForm,
      amount: parseMoneyInput(movementForm.amount),
    });
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveCategoryMutation.mutate(categoryForm);
  }

  function handleExportPdf() {
    const params = new URLSearchParams({
      statementKind,
      search: statementSearch,
      accountType,
      accountStatus,
      movementType,
      categoryType,
      activeFilter,
      from,
      to,
    });

    const url = `/api/financial-statement/pdf?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openAccountStatementPdf(accountId: string) {
    const params = new URLSearchParams({ accountId });
    window.open(
      `/api/financial-statement/pdf?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openMovementStatementPdf(movementId: string) {
    const params = new URLSearchParams({ movementId });
    window.open(
      `/api/financial-statement/pdf?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const totalItems =
    statementKind === "CONTA"
      ? accountsQuery.data?.total ?? 0
      : statementKind === "CAIXA"
        ? movementsQuery.data?.total ?? 0
        : statementKind === "CATEGORIA"
          ? categoriesQuery.data?.total ?? 0
          : (accountsQuery.data?.total ?? 0) + (movementsQuery.data?.total ?? 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Financeiro"
          description="Extrato financeiro unificado com contas, caixa e categorias."
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExportPdf} className="gap-1.5">
            <Download className="size-4" />
            Exportar PDF
          </Button>

          <Button type="button" onClick={() => openNewAccount("RECEBER")} className="gap-1.5">
            <Plus className="size-4" />
            Conta a receber
          </Button> 

          <Button type="button" variant="outline" onClick={() => openNewAccount("PAGAR")} className="gap-1.5">
            <Plus className="size-4" />
            Conta a pagar
          </Button>

          <Button type="button" variant="outline" onClick={() => openNewMovement("ENTRADA")} className="gap-1.5">
            <ArrowDownLeft className="size-4" />
            Entrada caixa
          </Button>

          <Button type="button" variant="outline" onClick={() => openNewMovement("SAIDA")} className="gap-1.5">
            <ArrowUpRight className="size-4" />
            Saída caixa
          </Button>

          <Button type="button" variant="outline" onClick={openNewCategory} className="gap-1.5">
            <FolderTree className="size-4" />
            Categoria
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Resultado realizado no caixa
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <strong
                  className={`font-heading text-3xl ${
                    cashTotals.balance < 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {formatCurrency(cashTotals.balance)}
                </strong>
                <span className="pb-1 text-sm text-muted-foreground">
                  margem {formatPercent(realizedMargin)}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Baseado nas entradas e saídas de caixa do período. Este é o número
                mais confiável para saber o rendimento financeiro já realizado.
              </p>
            </div>

            <div className="grid min-w-[14rem] gap-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Entradas</span>
                <strong className="text-emerald-700">{formatCurrency(cashTotals.entries)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Saídas</span>
                <strong className="text-rose-700">{formatCurrency(cashTotals.exits)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-2">
                <span className="text-muted-foreground">Projetado com abertas</span>
                <strong className={projectedBalance < 0 ? "text-rose-700" : "text-foreground"}>
                  {formatCurrency(projectedBalance)}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={ArrowDownLeft}
              label="A receber aberto"
              value={formatCurrency(openAccountTotals.receivableOpen)}
              detail={`${formatCurrency(
                openAccountTotals.activeServiceOrdersReceivable
              )} em OS ativas`}
              tone="text-emerald-700"
            />

            <Link href="/financeiro/contas-pagar" className="block" prefetch={false}>
              <SummaryCard
                icon={ArrowUpRight}
                label="A pagar aberto"
                value={formatCurrency(openAccountTotals.payableOpen)}
                detail="Inclui comissões pendentes"
                tone="text-rose-700"
              />
            </Link>

            <SummaryCard
              icon={CircleDollarSign}
              label="Saldo em aberto"
              value={formatCurrency(openBalance)}
              detail="A receber menos a pagar"
              tone={openBalance < 0 ? "text-rose-700" : "text-foreground"}
            />

            <SummaryCard
              icon={Wallet}
              label="Contas quitadas"
              value={`${formatCurrency(accountTotals.received)} / ${formatCurrency(
                accountTotals.paid
              )}`}
              detail={`Saldo carteira: ${formatCurrency(walletBalance)}`}
              tone={walletBalance < 0 ? "text-rose-700" : "text-foreground"}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Entradas x saídas</h2>
            <p className="text-xs text-muted-foreground">
              Comparativo simples do caixa no período filtrado.
            </p>
          </div>
          <ChartContainer config={cashChartConfig} className="h-[220px] w-full">
            <BarChart data={cashChartData} accessibilityLayer margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Período analisado:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Atalhos:
          </span>

          <Button
            type="button"
            variant={!from && !to ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setCurrentPage(1);
            }}
          >
            Todos
          </Button>

          <Button
            type="button"
            variant={
              from === lastDaysRange(1).from && to === lastDaysRange(1).to
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              const range = lastDaysRange(1);

              setFrom(range.from);
              setTo(range.to);
              setCurrentPage(1);
            }}
          >
            1 dia
          </Button>

          <Button
            type="button"
            variant={
              from === lastDaysRange(7).from && to === lastDaysRange(7).to
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              const range = lastDaysRange(7);

              setFrom(range.from);
              setTo(range.to);
              setCurrentPage(1);
            }}
          >
            7 dias
          </Button>

          <Button
            type="button"
            variant={
              from === lastDaysRange(30).from && to === lastDaysRange(30).to
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              const range = lastDaysRange(30);

              setFrom(range.from);
              setTo(range.to);
              setCurrentPage(1);
            }}
          >
            30 dias
          </Button>
        </div>
      </div>
      {errorMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{errorMessage}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setErrorMessage("")}>
            <X className="size-3" />
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={handleStatementSearch}
        className="rounded-lg border bg-card p-4 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">Filtros do extrato</h2>
          <p className="text-xs text-muted-foreground">
            Por padrão mostra somente o caixa realizado: valores que entraram ou saíram de fato.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_minmax(24rem,2fr)_minmax(15rem,1fr)_minmax(15rem,1fr)]">
          <FilterField label="Origem">
            <SelectFilter
          value={statementKind}
          onValueChange={(value) => {
            setStatementKind(value as StatementKindFilter);
            setCurrentPage(1);
          }}
        >
          <SelectItem value="TODOS">Completo (contas + caixa)</SelectItem>
          <SelectItem value="CONTA">Contas baixadas/agendadas</SelectItem>
          <SelectItem value="CAIXA">Caixa realizado</SelectItem>
          <SelectItem value="CATEGORIA">Categorias</SelectItem>
            </SelectFilter>
          </FilterField>

          <FilterField label="Busca">
            <SearchInput
          value={statementSearchInput}
          onChange={setStatementSearchInput}
          onClear={() => {
            setStatementSearchInput("");
            setStatementSearch("");
            setCurrentPage(1);
          }}
          placeholder="Buscar por descrição, categoria, documento, forma ou observação"
            />
          </FilterField>

          <FilterField label="Contas">
            <SelectFilter
          value={accountType}
          onValueChange={(value) => {
            setAccountType(value as AccountTypeFilter);
            setCurrentPage(1);
          }}
        >
          <SelectItem value="TODOS">Todas contas</SelectItem>
          {financialTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
            </SelectFilter>
          </FilterField>

          <FilterField label="Status">
            <SelectFilter
          value={accountStatus}
          onValueChange={(value) => {
            setAccountStatus(value as AccountStatusFilter);
            setCurrentPage(1);
          }}
        >
          <SelectItem value="TODOS">Todos status</SelectItem>
          {financialStatusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
            </SelectFilter>
          </FilterField>

        </div>

        <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_minmax(28rem,1.6fr)_minmax(15rem,1fr)_auto]">
          <FilterField label="Caixa">
            <SelectFilter
          value={movementType}
          onValueChange={(value) => {
            setMovementType(value as MovementTypeFilter);
            setCurrentPage(1);
          }}
        >
          <SelectItem value="TODOS">Todo caixa</SelectItem>
          {cashMovementTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
            </SelectFilter>
          </FilterField>

          <FilterField label="Periodo">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                value={from}
                className="h-10 rounded-lg bg-input/20 px-3 text-sm"
                aria-label="Data inicial"
                onChange={(event) => {
                  setFrom(event.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                type="date"
                value={to}
                className="h-10 rounded-lg bg-input/20 px-3 text-sm"
                aria-label="Data final"
                onChange={(event) => {
                  setTo(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </FilterField>

          <FilterField label="Categorias">
            <SelectFilter
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value as ActiveFilter);
                setCurrentPage(1);
              }}
            >
              <SelectItem value="TODOS">Todas categorias</SelectItem>
              <SelectItem value="ATIVAS">Ativas</SelectItem>
              <SelectItem value="INATIVAS">Inativas</SelectItem>
            </SelectFilter>
          </FilterField>

          <div className="flex flex-col-reverse gap-2 self-end sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={clearStatementFilters}
              className="h-10 px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              Limpar filtros
            </Button>
            <Button type="submit" className="h-10 px-5">
              Buscar
            </Button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Origem</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoadingStatement || isFetchingStatement ? (
              <TableMessage colSpan={10} message="Carregando extrato financeiro..." />
            ) : statementRows.length ? (
              statementRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (!shouldOpenDetails(event.target)) {
                      return;
                    }

                    if (row.account) {
                      openAccountDetails(row.account);
                      return;
                    }

                    if (row.movement) {
                      openMovementDetails(row.movement);
                      return;
                    }

                    if (row.categoryRecord) {
                      openCategoryDetails(row.categoryRecord);
                    }
                  }}
                >
                  <TableCell>
                    <Badge variant="secondary">
                      {row.kind === "CONTA"
                        ? "Conta"
                        : row.kind === "CAIXA"
                          ? "Caixa"
                          : "Categoria"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">#{row.code} {row.description}</div>
                  </TableCell>

                  <TableCell>{row.typeLabel}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.paymentMethod}</TableCell>

                  <TableCell className="text-right font-semibold">
                    {row.amount === null ? "-" : formatCurrency(row.amount)}
                  </TableCell>

                  <TableCell>{row.status}</TableCell>

                  <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                    {row.notes}
                  </TableCell>

                  <TableCell className="text-right">{row.actions}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableMessage colSpan={10} message="Nenhum registro encontrado no extrato." />
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Pagina {currentPage} de {totalPages} ({totalItems} registro(s))
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Proxima
          </Button>
        </div>
      </div>

      <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleAccountSubmit} className="flex min-h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editingAccount ? "Editar conta" : "Nova conta financeira"}</SheetTitle>
              <SheetDescription>Registre contas a receber ou contas a pagar.</SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <Field label="Tipo">
                <Select value={accountForm.type} onValueChange={(value) => setAccountForm((form) => ({ ...form, type: value as FinancialAccountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{financialTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Status">
                <Select value={accountForm.status} onValueChange={(value) => setAccountForm((form) => ({ ...form, status: value as FinancialAccountStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{financialStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Descrição" className="md:col-span-2">
                <Input value={accountForm.description} onChange={(event) => setAccountForm((form) => ({ ...form, description: event.target.value }))} required />
              </Field>

              <Field label="Contraparte">
                <Input value={accountForm.counterparty} onChange={(event) => setAccountForm((form) => ({ ...form, counterparty: event.target.value }))} placeholder="Cliente, fornecedor ou pessoa" />
              </Field>

              <Field label="Categoria">
                <Select value={accountForm.category || NO_CATEGORY} onValueChange={(value) => setAccountForm((form) => ({ ...form, category: value === NO_CATEGORY ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {(activeCategoriesQuery.data?.items ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Vencimento">
                <Input type="date" value={accountForm.dueDate} onChange={(event) => setAccountForm((form) => ({ ...form, dueDate: event.target.value }))} required />
              </Field>

              <Field label="Pagamento">
                <Input type="date" value={accountForm.paymentDate} onChange={(event) => setAccountForm((form) => ({ ...form, paymentDate: event.target.value }))} />
              </Field>

              <Field label="Valor">
                <Input type="number" step="0.01" min="0" value={accountForm.amount} onChange={(event) => setAccountForm((form) => ({ ...form, amount: event.target.value }))} required />
              </Field>

              <Field label="Valor pago">
                <Input type="number" step="0.01" min="0" value={accountForm.paidAmount} onChange={(event) => setAccountForm((form) => ({ ...form, paidAmount: event.target.value }))} />
              </Field>

              <Field label="Forma">
                <Select value={accountForm.paymentMethod || NO_PAYMENT_METHOD} onValueChange={(value) => setAccountForm((form) => ({ ...form, paymentMethod: value === NO_PAYMENT_METHOD ? "" : value as FinancialAccountFormValues["paymentMethod"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PAYMENT_METHOD}>Sem forma</SelectItem>
                    {financialPaymentMethodOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Documento">
                <Input value={accountForm.documentNumber} onChange={(event) => setAccountForm((form) => ({ ...form, documentNumber: event.target.value }))} />
              </Field>

              <Field label="Observações" className="md:col-span-2">
                <Textarea value={accountForm.notes} onChange={(event) => setAccountForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={saveAccountMutation.isPending}>
                {saveAccountMutation.isPending ? "Salvando..." : "Salvar conta"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={movementSheetOpen} onOpenChange={setMovementSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleMovementSubmit} className="flex min-h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editingMovement ? "Editar movimento" : "Novo movimento de caixa"}</SheetTitle>
              <SheetDescription>Registre entradas e saídas manuais do caixa.</SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <Field label="Tipo">
                <Select value={movementForm.type} onValueChange={(value) => setMovementForm((form) => ({ ...form, type: value as CashMovementType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cashMovementTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Categoria">
                <Select value={movementForm.categoryId || NO_CATEGORY} onValueChange={(value) => setMovementForm((form) => ({ ...form, categoryId: value === NO_CATEGORY ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {(activeCategoriesQuery.data?.items ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Descrição" className="md:col-span-2">
                <Input value={movementForm.description} onChange={(event) => setMovementForm((form) => ({ ...form, description: event.target.value }))} required />
              </Field>

              <Field label="Data">
                <Input type="date" value={movementForm.movementDate} onChange={(event) => setMovementForm((form) => ({ ...form, movementDate: event.target.value }))} required />
              </Field>

              <Field label="Valor">
                <Input
                  inputMode="decimal"
                  value={movementForm.amount}
                  onChange={(event) => setMovementForm((form) => ({ ...form, amount: formatMoneyInput(event.target.value) }))}
                  placeholder="0,00"
                  required
                />
              </Field>

              <Field label="Forma">
                <Select value={movementForm.paymentMethod || NO_PAYMENT_METHOD} onValueChange={(value) => setMovementForm((form) => ({ ...form, paymentMethod: value === NO_PAYMENT_METHOD ? "" : value as CashMovementFormValues["paymentMethod"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PAYMENT_METHOD}>Sem forma</SelectItem>
                    {financialPaymentMethodOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Documento">
                <Input value={movementForm.documentNumber} onChange={(event) => setMovementForm((form) => ({ ...form, documentNumber: event.target.value }))} />
              </Field>

              <Field label="Observações" className="md:col-span-2">
                <Textarea value={movementForm.notes} onChange={(event) => setMovementForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={saveMovementMutation.isPending}>
                {saveMovementMutation.isPending ? "Salvando..." : "Salvar movimento"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <form onSubmit={handleCategorySubmit} className="flex min-h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editingCategory ? "Editar categoria" : "Nova categoria financeira"}</SheetTitle>
              <SheetDescription>Classifique receitas, despesas ou categorias de uso geral.</SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-6 pb-6">
              <Field label="Nome">
                <Input value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} required />
              </Field>

              <Field label="Tipo">
                <Select value={categoryForm.type} onValueChange={(value) => setCategoryForm((form) => ({ ...form, type: value as FinancialCategoryType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{financialCategoryTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Situação">
                <Select value={categoryForm.active ? "ATIVA" : "INATIVA"} onValueChange={(value) => setCategoryForm((form) => ({ ...form, active: value === "ATIVA" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVA">Ativa</SelectItem>
                    <SelectItem value="INATIVA">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Observações">
                <Textarea value={categoryForm.notes} onChange={(event) => setCategoryForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={saveCategoryMutation.isPending}>
                {saveCategoryMutation.isPending ? "Salvando..." : "Salvar categoria"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailKind === "CAIXA"
                ? "Detalhes do movimento"
                : detailKind === "CATEGORIA"
                  ? "Detalhes da categoria"
                  : "Detalhes da conta"}
            </DialogTitle>
            <DialogDescription>
              Visualize as informações completas do registro financeiro.
            </DialogDescription>
          </DialogHeader>

          {detailKind === "CONTA" && selectedAccount ? (
            <div className="grid gap-4 text-sm">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openAccountStatementPdf(selectedAccount.id)}
                >
                  <Download className="size-3.5" />
                  Extrato PDF
                </Button>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Resumo</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Registro" value={`#${selectedAccount.code}`} />

                  <div className="grid gap-1 sm:col-span-2">
                    <span className="text-xs uppercase text-muted-foreground">Descrição</span>
                    <span className="font-medium">{selectedAccount.description}</span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Tipo</span>
                    <span>{getFinancialTypeLabel(selectedAccount.type)}</span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Status</span>
                    <span>{getFinancialStatusLabel(selectedAccount.status)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Datas</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Vencimento</span>
                    <span>{formatDate(selectedAccount.dueDate)}</span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Pagamento</span>
                    <span>{formatDate(selectedAccount.paymentDate)}</span>
                  </div>

                  <DetailItem label="Criado em" value={formatDate(selectedAccount.createdAt)} />
                  <DetailItem label="Atualizado em" value={formatDate(selectedAccount.updatedAt)} />
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valores</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Valor</span>
                    <span>{formatCurrency(selectedAccount.amount)}</span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Valor pago</span>
                    <span>{formatCurrency(selectedAccount.paidAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Classificação</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Categoria</span>
                    <span>{formatValue(selectedAccount.category)}</span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Forma</span>
                    <span>{formatValue(getPaymentMethodLabel(selectedAccount.paymentMethod))}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Relacionamento</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Contraparte</span>
                    <span>
                      {formatValue(
                        selectedAccount.client?.name ??
                          selectedAccount.supplier?.name ??
                          selectedAccount.counterparty
                      )}
                    </span>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs uppercase text-muted-foreground">Documento</span>
                    <span>{formatValue(selectedAccount.documentNumber)}</span>
                  </div>

                  <DetailItem
                    label="OS"
                    value={
                      selectedAccount.serviceOrder
                        ? `#${selectedAccount.serviceOrder.code} - ${selectedAccount.serviceOrder.status}`
                        : "-"
                    }
                  />

                  <DetailItem
                    label="Pedido"
                    value={
                      selectedAccount.supplierOrder
                        ? `#${selectedAccount.supplierOrder.code} - ${selectedAccount.supplierOrder.status}`
                        : "-"
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Observações</div>
                <div className="grid gap-1">
                  <span>{formatValue(selectedAccount.notes)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {detailKind === "CAIXA" && selectedMovement ? (
            <div className="grid gap-4 text-sm">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openMovementStatementPdf(selectedMovement.id)}
                >
                  <Download className="size-3.5" />
                  Extrato PDF
                </Button>
              </div>

              <DetailSection title="Resumo">
                <DetailItem label="Registro" value={`#${selectedMovement.code}`} />
                <DetailItem label="Tipo" value={getCashMovementTypeLabel(selectedMovement.type)} />
                <DetailItem label="Valor" value={formatCurrency(selectedMovement.amount)} />
                <DetailItem label="Data do caixa" value={formatDate(selectedMovement.movementDate)} />
                <div className="grid gap-1 sm:col-span-2">
                  <span className="text-xs uppercase text-muted-foreground">Descrição</span>
                  <span className="font-medium">{selectedMovement.description}</span>
                </div>
              </DetailSection>

              <DetailSection title="Classificação">
                <DetailItem label="Categoria" value={selectedMovement.category?.name ?? "-"} />
                <DetailItem
                  label="Tipo da categoria"
                  value={
                    selectedMovement.category
                      ? getFinancialCategoryTypeLabel(selectedMovement.category.type)
                      : "-"
                  }
                />
                <DetailItem
                  label="Forma"
                  value={formatValue(getPaymentMethodLabel(selectedMovement.paymentMethod))}
                />
                <DetailItem label="Documento" value={formatValue(selectedMovement.documentNumber)} />
              </DetailSection>

              <DetailSection title="Origem">
                <DetailItem
                  label="PDV"
                  value={selectedMovement.sale ? `#${selectedMovement.sale.code} - ${selectedMovement.sale.status}` : "-"}
                />
                <DetailItem
                  label="Conta financeira"
                  value={
                    selectedMovement.financialAccount
                      ? `#${selectedMovement.financialAccount.code} - ${getFinancialTypeLabel(
                          selectedMovement.financialAccount.type
                        )}`
                      : "-"
                  }
                />
                <DetailItem label="Criado em" value={formatDate(selectedMovement.createdAt)} />
                <DetailItem label="Atualizado em" value={formatDate(selectedMovement.updatedAt)} />
              </DetailSection>

              <DetailSection title="Observações">
                <div className="grid gap-1 sm:col-span-2">
                  <span>{formatValue(selectedMovement.notes)}</span>
                </div>
              </DetailSection>
            </div>
          ) : null}

          {detailKind === "CATEGORIA" && selectedCategory ? (
            <div className="grid gap-4 text-sm">
              <DetailSection title="Resumo">
                <DetailItem label="Registro" value={`#${selectedCategory.code}`} />
                <DetailItem label="Nome" value={selectedCategory.name} />
                <DetailItem
                  label="Tipo"
                  value={getFinancialCategoryTypeLabel(selectedCategory.type)}
                />
                <DetailItem label="Situação" value={selectedCategory.active ? "Ativa" : "Inativa"} />
                <DetailItem label="Criada em" value={formatDate(selectedCategory.createdAt)} />
                <DetailItem label="Atualizada em" value={formatDate(selectedCategory.updatedAt)} />
              </DetailSection>

              <DetailSection title="Observações">
                <div className="grid gap-1 sm:col-span-2">
                  <span>{formatValue(selectedCategory.notes)}</span>
                </div>
              </DetailSection>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function sumAccountPaid(
  summary: NonNullable<Awaited<ReturnType<typeof fetchFinancialAccounts>>>["summary"],
  type: FinancialAccountType,
  status: FinancialAccountStatus
) {
  return Number(summary.find((item) => item.type === type && item.status === status)?._sum.paidAmount ?? 0);
}

function sumCash(
  summary: NonNullable<Awaited<ReturnType<typeof fetchCashMovements>>>["summary"],
  type: CashMovementType
) {
  return Number(summary.find((item) => item.type === type)?._sum.amount ?? 0);
}

function invalidateFinancialQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
  queryClient.invalidateQueries({ queryKey: ["financial-open-summary"] });
  queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
  queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
  queryClient.invalidateQueries({ queryKey: ["financial-categories-options"] });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate text-lg font-semibold ${tone}`}>{value}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-10 rounded-lg bg-input/20 pl-9 pr-9 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder.includes("Ã") ? "Descricao, categoria, documento, forma ou observacao" : placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear ?? (() => onChange(""))}
          className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function SelectFilter({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 w-full rounded-lg bg-input/20 px-3 text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function TableMessage({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
