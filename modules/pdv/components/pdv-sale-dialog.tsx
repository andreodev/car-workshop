"use client";

import { useEffect, useState } from "react";
import Modal from "react-modal";

import { PdvProductEntry } from "./pdv-product-entry";
import { PdvSaleContextBar } from "./pdv-sale-context-bar";
import { PdvSaleHeader } from "./pdv-sale-header";
import { PdvSaleItemsTable } from "./pdv-sale-items-table";
import { PdvSaleSummary } from "./pdv-sale-summary";
import { usePdvSale } from "../hooks/use-pdv-sale";
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

function cleanupPdvScrollLock() {
  if (typeof document === "undefined") {
    return;
  }

  document.body.classList.remove("overflow-hidden");
  document.documentElement.classList.remove("overflow-hidden");

  if (document.body.style.pointerEvents === "none") {
    document.body.style.pointerEvents = "";
  }
}

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
    if (open) {
      return;
    }

    cleanupPdvScrollLock();
  }, [open]);

  useEffect(() => {
    return cleanupPdvScrollLock;
  }, []);

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
      className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden border border-border bg-background shadow-2xl outline-none sm:h-[calc(100vh-1.5rem)] sm:max-w-[1500px] sm:rounded-lg"
      overlayClassName="fixed inset-0 z-50 flex items-stretch justify-center bg-neutral-950/70 p-0 sm:items-center sm:p-3"
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
          <main className="flex min-h-[420px] flex-col border-border lg:min-h-0 lg:border-r">
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
        open={Boolean(controller.state.lastSale)}
        onOpenChange={(nextOpen) => {
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
                controller.actions.clearLastSale();
                window.setTimeout(() => {
                  controller.actions.close();
                  cleanupPdvScrollLock();
                }, 0);
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
