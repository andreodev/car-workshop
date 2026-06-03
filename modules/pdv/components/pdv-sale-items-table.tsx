import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

import { formatCurrency, type SaleLine } from "../utils/pdv-sale-utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PdvSaleItemsTableProps = {
  lines: SaleLine[];
  localError: string | null;
  successMessage: string | null;
  onRemoveLine?: (lineId: string) => void;
};

export function PdvSaleItemsTable({
  lines,
  localError,
  successMessage,
  onRemoveLine,
}: PdvSaleItemsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      {localError ? (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mb-3 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-2 md:hidden">
        {lines.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-md border border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            Nenhum item incluido.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.localId}
              className="rounded-md border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {line.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {line.quantity} x {formatCurrency(line.unitPrice)}
                  </p>
                </div>

                {onRemoveLine ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveLine(line.localId)}
                    title="Remover item"
                    aria-label="Remover item"
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Desconto</p>
                  <p className="font-medium">{formatCurrency(line.discount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-primary">
                    {formatCurrency(line.total)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-md border border-border md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                Produto
              </TableHead>
              <TableHead className="w-24 text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                Qtde.
              </TableHead>
              <TableHead className="w-36 text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                Unit.
              </TableHead>
              <TableHead className="w-28 text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                Desc.
              </TableHead>
              <TableHead className="w-36 text-right font-heading text-xs font-600 uppercase tracking-wider text-muted-foreground">
                Total
              </TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">Remover</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[320px] text-center text-sm text-muted-foreground">
                  Nenhum item incluido.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.localId} className="transition-colors hover:bg-accent/40">
                  <TableCell className="font-medium">{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.discount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(line.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onRemoveLine && onRemoveLine(line.localId)}
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
    </div>
  );
}
