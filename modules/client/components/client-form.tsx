"use client";

import { AnimatePresence, motion } from "framer-motion";

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
  } = useClientForm({ mode, initialData });

  const stepProps = {
    form,
    fieldErrors,
    onChange,
    onSelectChange,
    getInputState,
  };

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ClientFormStepValue)}
          className="flex-1"
        >
          <div className="flex flex-1 flex-col gap-8">
            <Header
              title={mode === "edit" ? "Editar cliente" : "Cadastro de cliente"}
              description="Preencha os dados do cliente para salvar no sistema."
            />

            <div className="pb-6">
              <ClientFormStepper activeStep={activeTab} />
            </div>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-6 pt-6">
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
                    {activeTab === "endereco" ? (
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
              <p className="text-xs text-muted-foreground">
                Revise os dados antes de salvar. As informações ficam disponíveis
                para os demais módulos do sistema.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                  {isSaving ? <Spinner size="sm" /> : null}
                  {isSaving ? "Salvando..." : "Salvar cliente"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </form>
    </section>
  );
}
