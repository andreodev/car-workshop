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
import { Spinner } from "@/components/ui/spinner";

type PdvSaleDialogProps = {
  open: boolean;
  defaultResponsible: string;
  onClose: () => void;

  serviceOrderId?: string;
  serviceOrderCode?: number | string;
  mode?: "PDV" | "SERVICE_ORDER";
};

export function PdvSaleDialog({
  open,
  defaultResponsible,
  onClose,
  serviceOrderId,
  serviceOrderCode,
  mode = "PDV",
}: PdvSaleDialogProps) {
  const isServiceOrderMode = mode === "SERVICE_ORDER" && Boolean(serviceOrderId);

  const controller = usePdvSale({
    open,
    defaultResponsible,
    onClose,
    serviceOrderId,
    mode,
  });

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

  const title = isServiceOrderMode
    ? `PDV - Finalizar OS${serviceOrderCode ? ` #${serviceOrderCode}` : ""}`
    : "PDV Venda balcão";

  const receiptDescription = controller.state.lastSale
    ? isServiceOrderMode
      ? `Pagamento da OS${serviceOrderCode ? ` #${serviceOrderCode}` : ""} registrado com sucesso.`
      : `Venda #${controller.state.lastSale.code} registrada com sucesso.`
    : isServiceOrderMode
      ? "Pagamento da ordem de serviço registrado com sucesso."
      : "Venda registrada com sucesso.";

      if (controller.state.serviceOrderLoading) {
  return (
    <Modal
      isOpen={open}
      appElement={appElement}
      onRequestClose={controller.actions.close}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc
      className="mx-auto flex h-[300px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-border bg-background shadow-2xl outline-none"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-3"
      bodyOpenClassName="overflow-hidden"
      htmlOpenClassName="overflow-hidden"
      contentLabel="Carregando OS"
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8 text-primary" />

        <div className="text-center">
          <p className="text-sm font-medium">
            Carregando ordem de serviço
          </p>

          <p className="text-xs text-muted-foreground">
            Aguarde enquanto os dados são carregados...
          </p>
        </div>
      </div>
    </Modal>
  );
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
      contentLabel={title}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        data-pdv-dialog="true"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <PdvSaleHeader
          title={title}
          onClose={controller.actions.close}
        />

        <PdvSaleContextBar controller={controller} />

        <div className="grid min-h-0 flex-1 bg-background lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="flex min-h-0 flex-col border-r border-border">
            {!isServiceOrderMode && <PdvProductEntry controller={controller} />}

            <PdvSaleItemsTable
              lines={controller.state.lines}
              localError={controller.state.localError}
              successMessage={controller.state.successMessage}
              onRemoveLine={
                isServiceOrderMode
                  ? undefined
                  : controller.actions.removeLine
              }
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
            <DialogTitle>
              {isServiceOrderMode
                ? "Ordem de serviço paga com sucesso"
                : "Recibo pronto para imprimir"}
            </DialogTitle>

            <DialogDescription>
              {receiptDescription}
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
                controller.actions.close();
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