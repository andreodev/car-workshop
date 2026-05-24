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
        "relative z-10 flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition-all shadow-md shadow-black/10",
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
      <div className="relative flex w-full flex-col gap-5 px-1 py-2 md:px-2">
        <div className="relative hidden w-full px-6 sm:block">
          <div className="absolute left-6 right-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-border/80" />
          <div
            className="absolute left-6 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
          />
        </div>

        <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
      {clientFormSteps.map((step, index) => {
        const isActive = step.value === activeStep;
        const isCompleted = index < activeIndex;

        return (
          <div
            key={step.value}
            className="relative flex flex-1 justify-center sm:min-w-0"
          >
            <TabsTrigger
              value={step.value}
              className={cn(
                "h-auto w-full rounded-none border-0 bg-transparent px-0 py-0",
                "flex flex-col items-center gap-3 whitespace-normal text-center transition-all",
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
                <span className="block text-sm font-semibold text-foreground sm:text-base">
                  {step.label}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground sm:px-2">
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
