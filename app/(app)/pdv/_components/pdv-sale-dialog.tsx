"use client";

import { useEffect, useState } from "react";
import Modal from "react-modal";

import { PdvProductEntry } from "./pdv-product-entry";
import { PdvSaleContextBar } from "./pdv-sale-context-bar";
import { PdvSaleHeader } from "./pdv-sale-header";
import { PdvSaleItemsTable } from "./pdv-sale-items-table";
import { PdvSaleSummary } from "./pdv-sale-summary";
import { usePdvSale } from "./use-pdv-sale";

type PdvSaleDialogProps = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;
};

export function PdvSaleDialog({ open, defaultResponsible, onClose }: PdvSaleDialogProps) {
  const controller = usePdvSale({ open, defaultResponsible, onClose });
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
    </Modal>
  );
}
