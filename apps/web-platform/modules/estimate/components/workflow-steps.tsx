import { CheckCircle2, Circle } from "lucide-react";
import type { EstimateFormStep } from "../types/estimate.types";

export interface WorkflowStep {
  id: EstimateFormStep;
  label: string;
  done: boolean;
}

interface WorkflowStepsProps {
  workflowSteps: WorkflowStep[];
  activeStep: EstimateFormStep;
  setActiveStep: React.Dispatch<React.SetStateAction<EstimateFormStep>>;
  workflowProgress: number;
}

export default function WorkflowSteps({
  workflowSteps,
  activeStep,
  setActiveStep,
  workflowProgress,
}: WorkflowStepsProps) {
  return (
    <section className="w-full border border-border bg-card p-5">
      <div className="flex w-full flex-col gap-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${workflowProgress}%` }}
          />
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-3">
          {workflowSteps.map((step, index) => {
            const isActive = activeStep === step.id;
            const StepIcon = step.done ? CheckCircle2 : Circle;

            return (
              <button
                key={step.id}
                type="button"
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                ].join(" ")}
                onClick={() => setActiveStep(step.id)}
              >
                <StepIcon
                  className={[
                    "size-4 shrink-0",
                    step.done
                      ? "text-emerald-600"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground",
                  ].join(" ")}
                />

                <span className="min-w-0">
                  <span className={isActive ? "font-semibold" : "font-medium"}>
                    {step.label}
                  </span>

                  <span className="block text-xs text-muted-foreground">
                    Etapa {index + 1}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
