import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CashierIcon } from "@hugeicons/core-free-icons";

import { keyboardShortcuts } from "../utils/pdv-sale-constants";
import { Button } from "@/components/ui/button";

type PdvSaleHeaderProps = {
  onClose: () => void;
  title?: string;
};

export function PdvSaleHeader({ onClose, title = "PDV Caixa" }: PdvSaleHeaderProps) {
  return (
    <header className="grid gap-3 border-b border-border bg-card px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HugeiconsIcon icon={CashierIcon} strokeWidth={2.2} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xs font-700 uppercase tracking-wide text-muted-foreground">
            Venda balcao
          </p>
          <h2 className="truncate font-heading text-2xl font-800 text-foreground">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="hidden flex-wrap gap-1.5 xl:flex">
          {keyboardShortcuts.map(([key, label]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              <kbd className="font-mono text-[0.68rem] font-semibold text-foreground">{key}</kbd>
              {label}
            </span>
          ))}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar PDV">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>
    </header>
  );
}
