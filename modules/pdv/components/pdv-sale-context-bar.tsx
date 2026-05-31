import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import type { SalePaymentMethod } from "../types/pdv.types";
import { NO_SECTOR_VALUE, paymentOptions } from "../utils/pdv-sale-constants";
import type { PdvSaleController } from "../hooks/use-pdv-sale";
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

type PdvSaleContextBarProps = {
  controller: PdvSaleController;
};

export function PdvSaleContextBar({ controller }: PdvSaleContextBarProps) {
  const { refs, queries, state, actions } = controller;
  const { clientInputRef, paymentTriggerRef } = refs;

  return (
    <div className="grid gap-3 border-b border-border bg-muted/30 px-4 py-3 lg:grid-cols-[minmax(320px,1.4fr)_300px_300px_220px] lg:items-start">
      <div className="min-w-0 space-y-1">
        <Label>Cliente</Label>
        <div className="relative flex">
          <Button
            type="button"
            className="h-10 rounded-r-none px-3"
            onClick={() => {
              actions.setSelectedClient(null);
              actions.setClientSearch("");
            }}
            title="Venda sem cliente"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} />
          </Button>
          <Input
            ref={clientInputRef}
            className="h-10 rounded-l-none"
            placeholder="Cliente nao informado"
            value={state.clientSearch}
            onKeyDown={actions.handleClientSearchKeyDown}
            onFocus={() => actions.setClientListOpen(true)}
            onBlur={() => window.setTimeout(() => actions.setClientListOpen(false), 120)}
            onChange={(event) => {
              actions.setClientSearch(event.target.value);
              actions.setSelectedClient(null);
              actions.setClientHighlightIndex(0);
              actions.setClientListOpen(true);
            }}
          />
          {state.clientListOpen && !state.selectedClient ? (
            <div className="absolute left-10 right-0 top-11 z-30 rounded-md border bg-popover shadow-lg">
              {queries.clientsQuery.data?.items.length ? (
                queries.clientsQuery.data.items.map((client, index) => (
                  <button
                    key={client.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      index === state.clientHighlightIndex ? "bg-muted" : ""
                    }`}
                    onClick={() => actions.selectClient(client)}
                  >
                    {client.name}
                  </button>
                ))
              ) : queries.clientsQuery.isFetching ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Carregando clientes...</div>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <Label>Funcionario</Label>
        <Input
          value={state.responsible}
          readOnly
          aria-readonly="true"
          className="h-10"
        />
      </div>

      <div className="min-w-0 space-y-1">
        <Label>Setor</Label>
        <Select value={state.sectorId} onValueChange={actions.setSectorId}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SECTOR_VALUE}>Sem escolher setor</SelectItem>
            {queries.sectorsQuery.data?.items.map((sector) => (
              <SelectItem key={sector.id} value={sector.id}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 space-y-1">
        <Label>Pagamento</Label>
        <Select
          value={state.paymentMethod}
          onValueChange={(value) => actions.setPaymentMethod(value as SalePaymentMethod)}
        >
          <SelectTrigger ref={paymentTriggerRef} className="h-10 w-full">
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
  );
}
