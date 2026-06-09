import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  Invoice01Icon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";

import { formatCurrency, parseDecimal } from "../utils/pdv-sale-utils";
import type { PdvSaleController } from "../hooks/use-pdv-sale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PdvSaleSummaryProps = {
  controller: PdvSaleController;
};

const paymentMethodOptions = [
  {
    value: "DINHEIRO",
    label: "Dinheiro",
  },
  {
    value: "PIX",
    label: "Pix",
  },
  {
    value: "CARTAO_CREDITO",
    label: "Cartão crédito",
  },
  {
    value: "CARTAO_DEBITO",
    label: "Cartão débito",
  },
] as const;

const creditInstallmentOptions = Array.from({ length: 12 }, (_, index) => {
  const installments = index + 1;

  return {
    value: String(installments),
    label: `${installments}x`,
  };
});

function toCurrencyNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function calculatePaymentLineFee(payment: {
  amount: string;
  feePercent: string;
}) {
  const amount = toCurrencyNumber(parseDecimal(payment.amount));
  const feePercent = Math.min(
    Math.max(toCurrencyNumber(parseDecimal(payment.feePercent)), 0),
    100
  );

  return toCurrencyNumber(amount * (feePercent / 100));
}

export function PdvSaleSummary({ controller }: PdvSaleSummaryProps) {
  const { refs, state, actions, mutations } = controller;

  const isSaving =
    mutations.saleMutation.isPending ||
    mutations.serviceOrderPaymentMutation.isPending;

  const finishDisabled =
    isSaving ||
    state.lines.length === 0 ||
    (!state.isServiceOrderMode && !state.responsible.trim()) ||
    (state.isServiceOrderMode && state.paymentBaseTotal <= 0) ||
    Math.abs(state.paymentDifference) > 0.009;

  return (
    <>
    <aside className="flex flex-col bg-card lg:min-h-0">
      <div className="space-y-3 border-y border-border p-3 sm:space-y-4 sm:border-t-0 sm:p-4 lg:border-b">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Cliente
          </p>

          <p className="mt-1 truncate text-base font-semibold text-foreground sm:text-lg">
            {state.selectedClient
              ? state.selectedClient.name
              : "Cliente nao informado"}
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Itens</span>
            <span className="font-semibold">{state.lines.length}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">
              {formatCurrency(state.totals.subtotal)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Desconto</span>
            <span className="font-semibold">
              {formatCurrency(state.totals.discount)}
            </span>
          </div>

          {state.isServiceOrderMode &&
          state.serviceOrderPaymentDiscountAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Desconto no pagamento
              </span>
              <span className="font-semibold">
                {formatCurrency(state.serviceOrderPaymentDiscountAmount)}
              </span>
            </div>
          ) : null}

          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa/acréscimo</span>
            <span className="font-semibold">
              {formatCurrency(state.paymentFeeTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:overflow-y-auto sm:p-4">
        <div className="rounded-lg bg-primary p-4 text-primary-foreground sm:p-5">
          <p className="text-sm font-medium uppercase opacity-80">Total</p>

          <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            {formatCurrency(state.expectedPaymentTotal)}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Pagamento
              </p>

              <p className="text-xs text-muted-foreground">
                {state.paymentLines.length > 1
                  ? `${state.paymentLines.length} formas informadas`
                  : "Uma forma informada"}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={actions.openPaymentDialog}
              disabled={state.lines.length === 0 || isSaving}
            >
              Editar
            </Button>
          </div>

          <div className="grid gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total pago</span>
              <span className="font-semibold">
                {formatCurrency(state.paymentTotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Total esperado</span>
              <span className="font-semibold">
                {formatCurrency(state.expectedPaymentTotal)}
              </span>
            </div>

            {Math.abs(state.paymentDifference) > 0.009 && (
              <div className="flex justify-between text-destructive">
                <span>Diferença</span>
                <span className="font-semibold">
                  {formatCurrency(Math.abs(state.paymentDifference))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-t border-border p-3 sm:p-4">
        <Button
          type="button"
          size="lg"
          className="h-11 gap-2 sm:h-12"
          onClick={actions.openPaymentDialog}
          disabled={
            isSaving ||
            state.lines.length === 0 ||
            (!state.isServiceOrderMode && !state.responsible.trim())
          }
          title="F8"
        >
          <HugeiconsIcon icon={PaymentSuccess01Icon} strokeWidth={2.5} />
          {state.isServiceOrderMode ? "Receber pagamento" : "Receber venda"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={actions.clearSale}
            disabled={
              state.isServiceOrderMode ||
              state.lines.length === 0 ||
              isSaving
            }
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2.5} />
            Limpar
          </Button>

          <Button type="button" variant="outline" onClick={actions.openSalesList}>
            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2.5} />
            Vendas
          </Button>
        </div>

        <Button type="button" variant="ghost" onClick={actions.close}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.5} />
          Fechar caixa
        </Button>
      </div>
    </aside>

    <Dialog
      open={state.paymentDialogOpen}
      onOpenChange={actions.setPaymentDialogOpen}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-4">
            {state.isServiceOrderMode ? (
              <div>
                <p className="text-xs text-muted-foreground">Desconto</p>
                <p className="text-sm font-semibold sm:text-lg">
                  {formatCurrency(state.serviceOrderPaymentDiscountAmount)}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-xs text-muted-foreground">Total esperado</p>
              <p className="text-sm font-semibold sm:text-lg">
                {formatCurrency(state.expectedPaymentTotal)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Total cobrado</p>
              <p className="text-sm font-semibold sm:text-lg">
                {formatCurrency(state.paymentTotal)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Taxa</p>
              <p className="text-sm font-semibold sm:text-lg">
                {formatCurrency(state.paymentFeeTotal)}
              </p>
            </div>
          </div>

          {state.isServiceOrderMode ? (
            <div className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-end">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Desconto antes do pagamento (%)
                </p>

                <Input
                  className="h-10"
                  value={state.serviceOrderDiscountPercent}
                  onChange={(event) =>
                    actions.setServiceOrderDiscountPercent(event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Valor do desconto:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(state.serviceOrderPaymentDiscountAmount)}
                </span>
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            {state.paymentLines.map((payment, index) => (
              <div
                key={payment.localId}
                className="grid gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    Forma {index + 1}
                  </p>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => actions.removePaymentLine(payment.localId)}
                    disabled={state.paymentLines.length <= 1}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2.5} />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Forma</p>

                    <Select
                      value={payment.paymentMethod}
                      onValueChange={(value) =>
                        actions.updatePaymentLine(
                          payment.localId,
                          "paymentMethod",
                          value
                        )
                      }
                    >
                      <SelectTrigger
                        ref={
                          payment.localId === state.paymentLines[0]?.localId
                            ? refs.paymentTriggerRef
                            : undefined
                        }
                        className="h-10 w-full"
                      >
                        <SelectValue placeholder="Forma" />
                      </SelectTrigger>

                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Valor base</p>

                    <Input
                      className="h-10"
                      value={payment.amount}
                      onChange={(event) =>
                        actions.updatePaymentLine(
                          payment.localId,
                          "amount",
                          event.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Taxa (%)</p>

                    <Input
                      className="h-10"
                      value={payment.feePercent}
                      onChange={(event) =>
                        actions.updatePaymentLine(
                          payment.localId,
                          "feePercent",
                          event.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="0"
                    />

                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor: {formatCurrency(calculatePaymentLineFee(payment))}
                    </p>
                  </div>
                </div>

                {payment.paymentMethod === "CARTAO_CREDITO" ? (
                  <div className="max-w-full sm:max-w-40">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Parcelas
                    </p>

                    <Select
                      value={String(payment.installments)}
                      onValueChange={(value) =>
                        actions.updatePaymentLine(
                          payment.localId,
                          "installments",
                          value
                        )
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Parcelas" />
                      </SelectTrigger>

                      <SelectContent>
                        {creditInstallmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:w-auto"
              onClick={actions.addPaymentLine}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
              Adicionar forma
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="h-10 sm:w-auto"
              onClick={actions.fillSinglePaymentWithTotal}
            >
              Preencher com total
            </Button>
          </div>

          {Math.abs(state.paymentDifference) > 0.009 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Diferença de {formatCurrency(Math.abs(state.paymentDifference))}
            </div>
          )}

          {state.localError ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {state.localError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => actions.setPaymentDialogOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            className="h-10"
            onClick={actions.saveSale}
            disabled={finishDisabled}
          >
            <HugeiconsIcon icon={PaymentSuccess01Icon} strokeWidth={2.5} />
            {state.isServiceOrderMode ? "Finalizar pagamento" : "Finalizar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
