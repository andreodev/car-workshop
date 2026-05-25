import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Delete02Icon,
  Invoice01Icon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";

import { formatCurrency } from "./pdv-sale-utils";
import type { PdvSaleController } from "./use-pdv-sale";
import { Button } from "@/components/ui/button";

type PdvSaleSummaryProps = {
  controller: PdvSaleController;
};

export function PdvSaleSummary({ controller }: PdvSaleSummaryProps) {
  const { state, actions, mutations } = controller;

  return (
    <aside className="flex min-h-0 flex-col bg-card">
      <div className="space-y-4 border-b border-border p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Cliente</p>
          <p className="mt-1 truncate text-lg font-semibold text-foreground">
            {state.selectedClient ? state.selectedClient.name : "Cliente nao informado"}
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Itens</span>
            <span className="font-semibold">{state.lines.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatCurrency(state.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Desconto</span>
            <span className="font-semibold">{formatCurrency(state.totals.discount)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center p-4">
        <div className="rounded-lg bg-primary p-5 text-primary-foreground">
          <p className="text-sm font-medium uppercase opacity-80">Total</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {formatCurrency(state.totals.total)}
          </p>
        </div>
      </div>

      <div className="grid gap-2 border-t border-border p-4">
        <Button
          type="button"
          size="lg"
          className="h-12 gap-2"
          onClick={actions.saveSale}
          disabled={
            mutations.saleMutation.isPending ||
            state.lines.length === 0 ||
            !state.responsible.trim()
          }
          title="F8"
        >
          <HugeiconsIcon icon={PaymentSuccess01Icon} strokeWidth={2.5} />
          Finalizar venda
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={actions.clearSale}
            disabled={state.lines.length === 0 || mutations.saleMutation.isPending}
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
