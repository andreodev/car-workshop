"use client";

import { useEffect, useState } from "react";
import Modal from "react-modal";

import { PdvProductEntry } from "./pdv-product-entry";
import { PdvSaleContextBar } from "./pdv-sale-context-bar";
import { PdvSaleHeader } from "./pdv-sale-header";
import { PdvSaleItemsTable } from "./pdv-sale-items-table";
import { PdvSaleSummary } from "./pdv-sale-summary";
import { usePdvSale } from "./use-pdv-sale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PdvSaleDialogProps = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;
};

export function PdvSaleDialog({ open, defaultResponsible, onClose }: PdvSaleDialogProps) {
  const controller = usePdvSale({ open, defaultResponsible, onClose });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [appElement] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") {
      return null;
    }

    return document.getElementById("app-root") ?? document.body;
  });

  useEffect(() => {
    if (appElement) {
      Modal.setAppElement(appElement);
    }
  }, [appElement]);

  useEffect(() => {
    if (controller.state.lastSale) {
      setReceiptOpen(true);
    }
  }, [controller.state.lastSale]);

  if (!open || !appElement) {
    return null;
  }

  return (
    <Modal
      isOpen={open}
      appElement={appElement}
      onRequestClose={controller.actions.close}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc
      className="mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl outline-none"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-3"
      bodyOpenClassName="overflow-hidden"
      htmlOpenClassName="overflow-hidden"
      contentLabel="PDV Venda balcao"
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        data-pdv-dialog="true"
        role="dialog"
        aria-modal="true"
        aria-label="PDV Venda balcao"
      >
        <PdvSaleHeader onClose={controller.actions.close} />
        <PdvSaleContextBar controller={controller} />

        <div className="grid min-h-0 flex-1 bg-background lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="flex min-h-0 flex-col border-r border-border">
            <PdvProductEntry controller={controller} />
            <PdvSaleItemsTable
              lines={controller.state.lines}
              localError={controller.state.localError}
              successMessage={controller.state.successMessage}
              onRemoveLine={controller.actions.removeLine}
            />
          </main>

          <PdvSaleSummary controller={controller} />
        </div>
      </div>

      <Dialog
        open={receiptOpen && Boolean(controller.state.lastSale)}
        onOpenChange={(nextOpen) => {
          setReceiptOpen(nextOpen);
          if (!nextOpen) {
            controller.actions.clearLastSale();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recibo pronto para imprimir</DialogTitle>
            <DialogDescription>
              {controller.state.lastSale
                ? `Venda #${controller.state.lastSale.code} registrada com sucesso.`
                : "Venda registrada com sucesso."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              asChild
              disabled={!controller.state.lastSale}
            >
              <a
                href={
                  controller.state.lastSale
                    ? `/api/sales/${controller.state.lastSale.id}/receipt`
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
              >
                Imprimir recibo
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReceiptOpen(false);
                controller.actions.clearLastSale();
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Modal>
  );
}
