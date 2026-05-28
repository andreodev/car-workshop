"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  Edit2,
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
  updateCashMovement,
  updateFinancialAccount,
  updateFinancialAccountStatus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PAGE_SIZE = 10;
const NO_CATEGORY = "SEM_CATEGORIA";
const NO_PAYMENT_METHOD = "SEM_FORMA";

type AccountTypeFilter = FinancialAccountType | "TODOS";
type AccountStatusFilter = FinancialAccountStatus | "TODOS";
type MovementTypeFilter = CashMovementType | "TODOS";
type CategoryTypeFilter = FinancialCategoryType | "TODOS";
type ActiveFilter = "TODOS" | "ATIVAS" | "INATIVAS";

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
  return new Date().toISOString().slice(0, 10);
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
    amount: String(movement.amount ?? ""),
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
  const [accountPage, setAccountPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [accountSearchInput, setAccountSearchInput] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [movementSearchInput, setMovementSearchInput] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeFilter>("TODOS");
  const [accountStatus, setAccountStatus] = useState<AccountStatusFilter>("TODOS");
  const [movementType, setMovementType] = useState<MovementTypeFilter>("TODOS");
  const [categoryType, setCategoryType] = useState<CategoryTypeFilter>("TODOS");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [movementFrom, setMovementFrom] = useState("");
  const [movementTo, setMovementTo] = useState("");
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [movementSheetOpen, setMovementSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [errorMessage, setErrorMessage] = useState("");

  const accountsQuery = useQuery({
    queryKey: ["financial-accounts", { accountPage, accountSearch, accountType, accountStatus, from, to }],
    queryFn: () =>
      fetchFinancialAccounts({
        page: accountPage,
        pageSize: PAGE_SIZE,
        search: accountSearch,
        type: accountType,
        status: accountStatus,
        from,
        to,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const movementsQuery = useQuery({
    queryKey: ["cash-movements", { movementPage, movementSearch, movementType, movementFrom, movementTo }],
    queryFn: () =>
      fetchCashMovements({
        page: movementPage,
        pageSize: PAGE_SIZE,
        search: movementSearch,
        type: movementType,
        from: movementFrom,
        to: movementTo,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ["financial-categories", { categorySearch, categoryType, activeFilter }],
    queryFn: () =>
      fetchFinancialCategories({
        pageSize: 100,
        search: categorySearch,
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
      receivableOpen: sumAccount(summary, "RECEBER", "ABERTA") + sumAccount(summary, "RECEBER", "VENCIDA"),
      payableOpen: sumAccount(summary, "PAGAR", "ABERTA") + sumAccount(summary, "PAGAR", "VENCIDA"),
      received: sumAccountPaid(summary, "RECEBER", "PAGA"),
      paid: sumAccountPaid(summary, "PAGAR", "PAGA"),
    };
  }, [accountsQuery.data]);

  const cashTotals = useMemo(() => {
    const summary = movementsQuery.data?.summary ?? [];
    const entries = sumCash(summary, "ENTRADA");
    const exits = sumCash(summary, "SAIDA");
    return { entries, exits, balance: entries - exits };
  }, [movementsQuery.data]);

  const accountTotalPages = Math.max(
    1,
    Math.ceil((accountsQuery.data?.total ?? 0) / (accountsQuery.data?.pageSize ?? PAGE_SIZE))
  );
  const movementTotalPages = Math.max(
    1,
    Math.ceil((movementsQuery.data?.total ?? 0) / (movementsQuery.data?.pageSize ?? PAGE_SIZE))
  );

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

  const accountStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FinancialAccountStatus }) =>
      updateFinancialAccountStatus(id, status),
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast({
        title: "Status atualizado",
        description: "A conta foi atualizada.",
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

  function handleAccountSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountPage(1);
    setAccountSearch(accountSearchInput.trim());
  }

  function handleMovementSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMovementPage(1);
    setMovementSearch(movementSearchInput.trim());
  }

  function handleCategorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategorySearch(categorySearchInput.trim());
  }

  function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveAccountMutation.mutate(accountForm);
  }

  function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveMovementMutation.mutate(movementForm);
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveCategoryMutation.mutate(categoryForm);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header
          title="Financeiro"
          description="Controle contas a receber, contas a pagar, caixa e categorias financeiras."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => openNewAccount("RECEBER")} className="gap-1.5">
            <Plus className="size-4" />
            Conta a receber
          </Button>
          <Button type="button" variant="outline" onClick={() => openNewMovement("ENTRADA")} className="gap-1.5">
            <ArrowDownLeft className="size-4" />
            Entrada caixa
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ArrowDownLeft} label="A receber aberto" value={formatCurrency(accountTotals.receivableOpen)} tone="text-emerald-700" />
        <SummaryCard icon={ArrowUpRight} label="A pagar aberto" value={formatCurrency(accountTotals.payableOpen)} tone="text-rose-700" />
        <SummaryCard icon={Banknote} label="Caixa filtrado" value={formatCurrency(cashTotals.balance)} tone={cashTotals.balance >= 0 ? "text-emerald-700" : "text-rose-700"} />
        <SummaryCard icon={Wallet} label="Recebido / pago" value={`${formatCurrency(accountTotals.received)} / ${formatCurrency(accountTotals.paid)}`} tone="text-foreground" />
      </div>

      {errorMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{errorMessage}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setErrorMessage("")}>
            <X className="size-3" />
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="contas" className="gap-4">
        <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-md md:w-fit">
          <TabsTrigger value="contas" className="px-3">Contas</TabsTrigger>
          <TabsTrigger value="caixa" className="px-3">Caixa</TabsTrigger>
          <TabsTrigger value="categorias" className="px-3">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          <form
            onSubmit={handleAccountSearch}
            className="grid gap-3 rounded-md border bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px_auto]"
          >
            <SearchInput
              value={accountSearchInput}
              onChange={setAccountSearchInput}
              placeholder="Buscar por conta, contraparte, categoria ou documento"
            />
            <SelectFilter value={accountType} onValueChange={(value) => { setAccountType(value as AccountTypeFilter); setAccountPage(1); }}>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              {financialTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectFilter>
            <SelectFilter value={accountStatus} onValueChange={(value) => { setAccountStatus(value as AccountStatusFilter); setAccountPage(1); }}>
              <SelectItem value="TODOS">Todos status</SelectItem>
              {financialStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectFilter>
            <Input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setAccountPage(1); }} />
            <Input type="date" value={to} onChange={(event) => { setTo(event.target.value); setAccountPage(1); }} />
            <Button type="submit">Buscar</Button>
          </form>

          <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
            <Table className="min-w-[1060px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsQuery.isLoading ? (
                  <TableMessage colSpan={8} message="Carregando contas..." />
                ) : accountsQuery.data?.items.length ? (
                  accountsQuery.data.items.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="font-medium">#{account.code} {account.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.serviceOrder
                            ? `OS #${account.serviceOrder.code}`
                            : account.supplierOrder
                              ? `Pedido #${account.supplierOrder.code}`
                              : account.documentNumber || account.notes || ""}
                        </div>
                      </TableCell>
                      <TableCell>{getFinancialTypeLabel(account.type)}</TableCell>
                      <TableCell>{account.client?.name ?? account.counterparty ?? "-"}</TableCell>
                      <TableCell>{account.category ?? "-"}</TableCell>
                      <TableCell>{formatDate(account.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(account.amount)}</TableCell>
                      <TableCell>{statusBadge(account.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">

                          <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEditAccount(account)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button type="button" variant="destructive" size="icon-sm" title="Cancelar" onClick={() => confirm("Cancelar esta conta? Se estiver paga, um estorno será lançado no caixa.") && deleteAccountMutation.mutate(account.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableMessage colSpan={8} message="Nenhuma conta encontrada." />
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination page={accountPage} totalPages={accountTotalPages} onPrevious={() => setAccountPage((page) => Math.max(1, page - 1))} onNext={() => setAccountPage((page) => Math.min(accountTotalPages, page + 1))} />
        </TabsContent>

        <TabsContent value="caixa" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard icon={ArrowDownLeft} label="Entradas" value={formatCurrency(cashTotals.entries)} tone="text-emerald-700" />
            <SummaryCard icon={ArrowUpRight} label="Saidas" value={formatCurrency(cashTotals.exits)} tone="text-rose-700" />
            <SummaryCard icon={Banknote} label="Saldo" value={formatCurrency(cashTotals.balance)} tone={cashTotals.balance >= 0 ? "text-emerald-700" : "text-rose-700"} />
          </div>

          <form
            onSubmit={handleMovementSearch}
            className="grid gap-3 rounded-md border bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_auto_auto]"
          >
            <SearchInput value={movementSearchInput} onChange={setMovementSearchInput} placeholder="Buscar por descrição, documento ou categoria" />
            <SelectFilter value={movementType} onValueChange={(value) => { setMovementType(value as MovementTypeFilter); setMovementPage(1); }}>
              <SelectItem value="TODOS">Todos tipos</SelectItem>
              {cashMovementTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectFilter>
            <Input type="date" value={movementFrom} onChange={(event) => { setMovementFrom(event.target.value); setMovementPage(1); }} />
            <Input type="date" value={movementTo} onChange={(event) => { setMovementTo(event.target.value); setMovementPage(1); }} />
            <Button type="submit">Buscar</Button>
            <Button type="button" variant="outline" onClick={() => openNewMovement("SAIDA")}>
              <Plus className="size-4" />
              Saida
            </Button>
          </form>

          <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Movimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsQuery.isLoading ? (
                  <TableMessage colSpan={7} message="Carregando movimentos..." />
                ) : movementsQuery.data?.items.length ? (
                  movementsQuery.data.items.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="font-medium">#{movement.code} {movement.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {movement.sale
                            ? `PDV #${movement.sale.code}`
                            : movement.financialAccount
                              ? `Conta #${movement.financialAccount.code}`
                              : movement.documentNumber || movement.notes || ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={movement.type === "ENTRADA" ? "bg-emerald-600/10 text-emerald-700" : "bg-rose-600/10 text-rose-700"}>
                          {getCashMovementTypeLabel(movement.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.category?.name ?? "-"}</TableCell>
                      <TableCell>{formatDate(movement.movementDate)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(movement.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(movement.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEditMovement(movement)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            title={movement.sale || movement.financialAccount ? "Estorne pela origem" : "Estornar"}
                            disabled={Boolean(movement.sale || movement.financialAccount)}
                            onClick={() => confirm("Estornar este movimento? Um lançamento inverso será criado no caixa.") && deleteMovementMutation.mutate(movement.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableMessage colSpan={7} message="Nenhum movimento encontrado." />
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination page={movementPage} totalPages={movementTotalPages} onPrevious={() => setMovementPage((page) => Math.max(1, page - 1))} onNext={() => setMovementPage((page) => Math.min(movementTotalPages, page + 1))} />
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <form
            onSubmit={handleCategorySearch}
            className="grid gap-3 rounded-md border bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_150px_150px_auto_auto]"
          >
            <SearchInput value={categorySearchInput} onChange={setCategorySearchInput} placeholder="Buscar categoria financeira" />
            <SelectFilter value={categoryType} onValueChange={(value) => setCategoryType(value as CategoryTypeFilter)}>
              <SelectItem value="TODOS">Todos tipos</SelectItem>
              {financialCategoryTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectFilter>
            <SelectFilter value={activeFilter} onValueChange={(value) => setActiveFilter(value as ActiveFilter)}>
              <SelectItem value="TODOS">Todas</SelectItem>
              <SelectItem value="ATIVAS">Ativas</SelectItem>
              <SelectItem value="INATIVAS">Inativas</SelectItem>
            </SelectFilter>
            <Button type="submit">Buscar</Button>
            <Button type="button" variant="outline" onClick={openNewCategory}>
              <FolderTree className="size-4" />
              Nova categoria
            </Button>
          </form>

          <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesQuery.isLoading ? (
                  <TableMessage colSpan={5} message="Carregando categorias..." />
                ) : categoriesQuery.data?.items.length ? (
                  categoriesQuery.data.items.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">#{category.code} {category.name}</TableCell>
                      <TableCell>{getFinancialCategoryTypeLabel(category.type)}</TableCell>
                      <TableCell>
                        <Badge variant={category.active ? "default" : "secondary"} className={category.active ? "bg-emerald-600/10 text-emerald-700" : ""}>
                          {category.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>{category.notes ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEditCategory(category)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" title={category.active ? "Inativar" : "Ativar"} onClick={() => categoryActiveMutation.mutate({ id: category.id, active: !category.active })}>
                            {category.active ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                          </Button>
                          <Button type="button" variant="destructive" size="icon-sm" title="Excluir" onClick={() => confirm("Excluir esta categoria?") && deleteCategoryMutation.mutate(category.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableMessage colSpan={5} message="Nenhuma categoria encontrada." />
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

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
              <Button type="submit" disabled={saveAccountMutation.isPending}>{saveAccountMutation.isPending ? "Salvando..." : "Salvar conta"}</Button>
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
                <Input type="number" step="0.01" min="0" value={movementForm.amount} onChange={(event) => setMovementForm((form) => ({ ...form, amount: event.target.value }))} required />
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
              <Button type="submit" disabled={saveMovementMutation.isPending}>{saveMovementMutation.isPending ? "Salvando..." : "Salvar movimento"}</Button>
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
              <Button type="submit" disabled={saveCategoryMutation.isPending}>{saveCategoryMutation.isPending ? "Salvando..." : "Salvar categoria"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function sumAccount(
  summary: NonNullable<Awaited<ReturnType<typeof fetchFinancialAccounts>>>["summary"],
  type: FinancialAccountType,
  status: FinancialAccountStatus
) {
  return Number(summary.find((item) => item.type === type && item.status === status)?._sum.amount ?? 0);
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
  queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
  queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
  queryClient.invalidateQueries({ queryKey: ["financial-categories-options"] });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
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
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
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
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
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

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
      <Button type="button" variant="outline" disabled={page <= 1} onClick={onPrevious}>
        Anterior
      </Button>
      <Button type="button" variant="outline" disabled={page >= totalPages} onClick={onNext}>
        Próxima
      </Button>
    </div>
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
