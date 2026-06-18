"use client";

import type { LucideIcon } from "lucide-react";
import { ClipboardList, FileText, Wrench } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const serviceOrderFormSteps = [
  {
    value: "cabecalho",
    label: "Cabeçalho",
    description: "Cliente, veículo e datas",
    icon: ClipboardList,
  },
  {
    value: "itens",
    label: "Itens",
    description: "Serviços e valores",
    icon: Wrench,
  },
  {
    value: "observações",
    label: "Observações",
    description: "Notas internas e cliente",
    icon: FileText,
  },
] as const;

export type ServiceOrderFormStepValue =
  (typeof serviceOrderFormSteps)[number]["value"];

type ServiceOrderFormStepperProps = {
  activeStep: ServiceOrderFormStepValue;
};

function StepIcon({
  icon: Icon,
  isActive,
  isCompleted,
  index,
}: {
  icon: LucideIcon;
  isActive: boolean;
  isCompleted: boolean;
  index: number;
}) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-semibold shadow-md shadow-black/10 transition-all sm:size-12",
        isCompleted || isActive
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "border-border bg-background text-muted-foreground"
      )}
    >
      {isCompleted ? <Icon className="size-4" /> : index + 1}
    </span>
  );
}

export function ServiceOrderFormStepper({
  activeStep,
}: ServiceOrderFormStepperProps) {
  const activeIndex = serviceOrderFormSteps.findIndex(
    (step) => step.value === activeStep
  );
  const progress =
    serviceOrderFormSteps.length <= 1
      ? 0
      : (activeIndex / (serviceOrderFormSteps.length - 1)) * 100;

  return (
    <TabsList className="h-auto w-full bg-transparent p-0">
      <div className="relative flex w-full flex-col gap-3 px-0 py-1 sm:gap-5 sm:px-1 sm:py-2 md:px-2">
        <div className="relative hidden w-full px-6 sm:block">
          <div className="absolute left-6 right-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-border/80" />
          <div
            className="absolute left-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
          />
        </div>

        <div className="flex w-full items-start justify-between gap-1 sm:gap-0">
          {serviceOrderFormSteps.map((step, index) => {
            const isActive = step.value === activeStep;
            const isCompleted = index < activeIndex;

            return (
              <div
                key={step.value}
                className="relative flex min-w-0 flex-1 justify-center"
              >
                <TabsTrigger
                  value={step.value}
                  className={cn(
                    "h-auto w-full rounded-none border-0 bg-transparent px-0 py-0",
                    "flex flex-col items-center gap-2 whitespace-normal text-center transition-all sm:gap-3",
                    isActive
                      ? "text-foreground"
                      : "text-foreground/80 hover:text-foreground"
                  )}
                >
                  <div className="relative flex w-full justify-center">
                    <StepIcon
                      icon={step.icon}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      index={index}
                    />
                  </div>

                  <span className="min-w-0 space-y-1">
                    <span className="block text-xs font-semibold leading-tight text-foreground sm:text-base">
                      {step.label}
                    </span>
                    <span className="hidden text-xs leading-relaxed text-muted-foreground sm:block sm:px-2">
                      {step.description}
                    </span>
                  </span>
                </TabsTrigger>
              </div>
            );
          })}
        </div>
      </div>
    </TabsList>
  );
}
