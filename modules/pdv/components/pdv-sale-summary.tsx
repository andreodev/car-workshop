import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  Invoice01Icon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";

import { formatCurrency } from "../utils/pdv-sale-utils";
import type { PdvSaleController } from "../hooks/use-pdv-sale";
import { Button } from "@/components/ui/button";
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

export function PdvSaleSummary({ controller }: PdvSaleSummaryProps) {
  const { state, actions, mutations } = controller;

  const isSaving =
    mutations.saleMutation.isPending ||
    mutations.serviceOrderPaymentMutation.isPending;

  const finishDisabled =
    isSaving ||
    state.lines.length === 0 ||
    (!state.isServiceOrderMode && !state.responsible.trim()) ||
    Math.abs(state.paymentDifference) > 0.009;

  return (
    <aside className="flex min-h-0 flex-col bg-card">
      <div className="space-y-4 border-b border-border p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Cliente
          </p>

          <p className="mt-1 truncate text-lg font-semibold text-foreground">
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

          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa/acréscimo</span>
            <span className="font-semibold">
              {formatCurrency(state.paymentFeeTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="rounded-lg bg-primary p-5 text-primary-foreground">
          <p className="text-sm font-medium uppercase opacity-80">Total</p>

          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {formatCurrency(state.expectedPaymentTotal)}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Pagamentos
              </p>

              <p className="text-xs text-muted-foreground">
                Aceita uma ou mais formas
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={actions.addPaymentLine}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
              Adicionar
            </Button>
          </div>

          <div className="space-y-3">
            {state.paymentLines.map((payment) => (
              <div
                key={payment.localId}
                className="grid gap-2 rounded-md border border-border bg-background p-2"
              >
                <div className="flex gap-2">
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
                    <SelectTrigger className="h-9 flex-1">
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Valor</p>

                    <Input
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
                    <p className="mb-1 text-xs text-muted-foreground">Taxa</p>

                    <Input
                      value={payment.feeAmount}
                      onChange={(event) =>
                        actions.updatePaymentLine(
                          payment.localId,
                          "feeAmount",
                          event.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={actions.fillSinglePaymentWithTotal}
          >
            Preencher com total
          </Button>

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

      <div className="grid gap-2 border-t border-border p-4">
        <Button
          type="button"
          size="lg"
          className="h-12 gap-2"
          onClick={actions.saveSale}
          disabled={finishDisabled}
          title="F8"
        >
          <HugeiconsIcon icon={PaymentSuccess01Icon} strokeWidth={2.5} />
          {state.isServiceOrderMode ? "Finalizar pagamento" : "Finalizar venda"}
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
  );
}
