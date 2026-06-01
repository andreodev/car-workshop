"use client";

import type { LucideIcon } from "lucide-react";
import { MapPinned, PhoneCall, UserRound } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const clientFormSteps = [
  {
    value: "dados",
    label: "Dados",
    description: "Informações principais",
    icon: UserRound,
  },
  {
    value: "contato",
    label: "Contato",
    description: "Canais de atendimento",
    icon: PhoneCall,
  },
  {
    value: "endereco",
    label: "Endereço",
    description: "Localização e referência fiscal",
    icon: MapPinned,
  },
] as const;

export type ClientFormStepValue = (typeof clientFormSteps)[number]["value"];

type ClientFormStepperProps = {
  activeStep: ClientFormStepValue;
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
        "relative z-10 flex size-9 items-center justify-center rounded-full border text-xs font-semibold transition-all shadow-sm shadow-black/10 sm:size-12 sm:text-sm sm:shadow-md",
        isCompleted || isActive
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "border-border bg-background text-muted-foreground"
      )}
    >
      {isCompleted ? <Icon className="size-4" /> : index + 1}
    </span>
  );
}

export function ClientFormStepper({ activeStep }: ClientFormStepperProps) {
  const activeIndex = clientFormSteps.findIndex((step) => step.value === activeStep);
  const progress =
    clientFormSteps.length <= 1
      ? 0
      : (activeIndex / (clientFormSteps.length - 1)) * 100;

  return (
    <TabsList className="w-full bg-transparent p-0">
      <div className="relative flex w-full flex-col gap-4 px-0 py-1 sm:gap-5 sm:px-1 sm:py-2 md:px-2">
        <div className="relative hidden w-full px-6 sm:block">
          <div className="absolute left-6 right-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-border/80" />
          <div
            className="absolute left-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
          />
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:items-start sm:justify-between sm:gap-0">
          {clientFormSteps.map((step, index) => {
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
                    "h-full w-full rounded-lg border border-border/70 bg-background/70 px-2 py-2 sm:h-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0",
                    "flex flex-col items-center gap-3 whitespace-normal text-center transition-all",
                    "data-active:border-primary/40 data-active:bg-primary/5 sm:data-active:border-0 sm:data-active:bg-transparent",
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

                  <span className="space-y-1">
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
