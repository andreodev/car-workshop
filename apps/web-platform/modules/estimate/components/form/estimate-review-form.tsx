import { formatCurrency } from "@/lib/finance/formatCurrency";
import type { vehiclesService } from "@/modules/vehicle/api/vehicle.service";
import type { fetchClients } from "@/modules/client/api/client.service";
import type { fetchMechanics } from "@/app/(app)/mecanicos/mechanic-api";

import type { EstimateFormValues } from "../../types/estimate.types";
import {
  getVehicleLabel,
  normalizeAmount,
} from "../../utils/estimate-form-utils";

type ClientsResponse = Awaited<ReturnType<typeof fetchClients>>;
type VehiclesResponse = Awaited<ReturnType<typeof vehiclesService.list>>;
type MechanicsResponse = Awaited<ReturnType<typeof fetchMechanics>>;

type Client = ClientsResponse["items"][number];
type Vehicle = VehiclesResponse["items"][number];
type Mechanic = MechanicsResponse["items"][number];

type EstimateReviewFormProps = {
  selectedClient?: Client;
  selectedVehicle?: Vehicle;
  selectedMechanic?: Mechanic;
  form: EstimateFormValues;
  totals: {
    commissionBaseTotal: number;
  };
};

export function EstimateReviewForm({
  selectedClient,
  selectedVehicle,
  selectedMechanic,
  form,
  totals,
}: EstimateReviewFormProps) {
  const validItemsCount = form.items.filter((item) => {
    return (
      item.description.trim() &&
      normalizeAmount(item.quantity) > 0 &&
      normalizeAmount(item.unitPrice) > 0
    );
  }).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-7 py-5">
        <h2 className="text-base font-semibold text-foreground">
          Revisão do orçamento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira os dados principais antes de salvar.
        </p>
      </div>

      <div className="grid gap-6 p-7 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proposta
          </p>

          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              {selectedClient?.name ?? "Cliente pendente"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {getVehicleLabel(selectedVehicle)}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Validade: {form.validUntil || "Não informada"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Itens
          </p>

          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              {validItemsCount}/{form.items.length} itens válidos
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {selectedMechanic?.name ?? "Mecânico pendente"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Base comissão: {formatCurrency(totals.commissionBaseTotal)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}