"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import type { Client } from "../types/client.types";
import { useClientForm } from "../hooks/use-client-form";
import { ClientFormContatoStep } from "./client-form-contato-step";
import { ClientFormDadosStep } from "./client-form-dados-step";
import { ClientFormEnderecoStep } from "./client-form-endereco-step";
import {
  ClientFormStepper,
  type ClientFormStepValue,
} from "./client-form-stepper";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";

type ClientFormProps = {
  mode: "create" | "edit";
  initialData?: Client | null;
};

export function ClientForm({ mode, initialData }: ClientFormProps) {
  const {
    form,
    activeTab,
    fieldErrors,
    isSaving,
    errorMessage,
    cepError,
    isCepLoading,
    setActiveTab,
    onChange,
    onSelectChange,
    getInputState,
    handleSubmit,
    handleCancel,
    errorCount,
  } = useClientForm({ mode, initialData });

  const [dismissedErrorCount, setDismissedErrorCount] = useState(0);
  const fieldErrorMessages = useMemo(
    () => Object.values(fieldErrors).filter((error): error is string => Boolean(error)),
    [fieldErrors],
  );
  const isErrorDialogOpen = Boolean(errorMessage) && errorCount > dismissedErrorCount;

  const stepProps = {
    form,
    fieldErrors,
    onChange,
    onSelectChange,
    getInputState,
  };

  return (
    <section className="relative flex min-h-[calc(100vh-8rem)] w-full flex-col pb-4">
      {isSaving ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Spinner size="sm" className="text-primary" />
            Salvando cliente...
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ClientFormStepValue)}
          className="flex-1"
        >
          <div className="flex flex-1 flex-col gap-5 sm:gap-8">
            <Header
              title={mode === "edit" ? "Editar cliente" : "Cadastro de cliente"}
              description="Preencha os dados do cliente para salvar no sistema."
            />

            <div className="pb-2 sm:pb-6">
              <ClientFormStepper activeStep={activeTab} />
            </div>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-5 px-3 pt-4 sm:space-y-6 sm:px-4 sm:pt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {activeTab === "dados" ? <ClientFormDadosStep {...stepProps} /> : null}
                    {activeTab === "contato" ? <ClientFormContatoStep {...stepProps} /> : null}
                    {activeTab === "Endereço" ? (
                      <ClientFormEnderecoStep
                        cepError={cepError}
                        isCepLoading={isCepLoading}
                        {...stepProps}
                      />
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertTitle>Erro ao salvar cliente</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
              <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-xl">
                Revise os dados antes de salvar. As informações ficam disponíveis
                para os demais módulos do sistema.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving}
                  className="w-full gap-2 sm:w-auto"
                >
                  {isSaving ? <Spinner size="sm" /> : null}
                  {isSaving ? "Salvando..." : "Salvar cliente"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </form>

      <Dialog
        open={isErrorDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDismissedErrorCount(errorCount);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Erro ao salvar cliente</DialogTitle>
            <DialogDescription>
              {errorMessage ?? "Não foi possível salvar o cliente."}
            </DialogDescription>
          </DialogHeader>

          {fieldErrorMessages.length > 0 ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-medium">Campos que precisam de atenção:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {fieldErrorMessages.slice(0, 5).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" className="w-full sm:w-auto">
                Entendi
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
