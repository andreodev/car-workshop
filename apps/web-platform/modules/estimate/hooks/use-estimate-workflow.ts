import { useMemo, useState } from "react";

import type { EstimateFormStep, EstimateFormValues } from "../types/estimate.types";
import { getEstimateItemValidationError } from "../utils/estimate-form-utils";

export function useEstimateWorkflow(form: EstimateFormValues) {
  const [activeStep, setActiveStep] = useState<EstimateFormStep>("client");

  const canProceedFromClient = Boolean(form.clientId && form.vehicleId);

  const canProceedFromItems =
    form.items.length > 0 &&
    form.items.every(
      (item, index) => !getEstimateItemValidationError(item, index),
    );

  const workflowSteps = useMemo(
    () => [
      { id: "client" as const, label: "Cliente", done: canProceedFromClient },
      { id: "items" as const, label: "Itens", done: canProceedFromItems },
      { id: "review" as const, label: "Salvar", done: false },
    ],
    [canProceedFromClient, canProceedFromItems],
  );

  const workflowProgress = useMemo(() => {
    const completedWorkflowCount = workflowSteps.filter((step) => step.done).length;

    return Math.round((completedWorkflowCount / workflowSteps.length) * 100);
  }, [workflowSteps]);

  return {
    activeStep,
    setActiveStep,
    workflowSteps,
    workflowProgress,
    canProceedFromClient,
    canProceedFromItems,
  };
}