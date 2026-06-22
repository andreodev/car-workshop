import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRound } from "lucide-react";

import type { EstimateFormValues } from "../../types/estimate.types";
import type { fetchClients } from "@/modules/client/api/client.service";
import type { vehiclesService } from "@/modules/vehicle/api/vehicle.service";

type ClientsResponse = Awaited<ReturnType<typeof fetchClients>>;
type VehiclesResponse = Awaited<ReturnType<typeof vehiclesService.list>>;

type Vehicle = VehiclesResponse["items"][number];

interface EstimateClientFormProps {
  form: EstimateFormValues;
  setForm: Dispatch<SetStateAction<EstimateFormValues>>;
  clientsQuery: UseQueryResult<ClientsResponse>;
  vehiclesQuery: UseQueryResult<VehiclesResponse>;
  availableVehicles: Vehicle[];
  getVehicleLabel: (vehicle: Vehicle) => string;
  onChange: (
    field: keyof EstimateFormValues,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function EstimateClientForm({
  form,
  setForm,
  clientsQuery,
  vehiclesQuery,
  availableVehicles,
  getVehicleLabel,
  onChange,
}: EstimateClientFormProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Dados da proposta
          </h2>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-2">
          <Label>Cliente</Label>

          <Select
            value={form.clientId}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                clientId: value,
                vehicleId: "",
              }))
            }
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue
                placeholder={
                  clientsQuery.isLoading
                    ? "Carregando clientes..."
                    : "Selecione"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {(clientsQuery.data?.items ?? []).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Veículo</Label>

          <Select
            value={form.vehicleId}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                vehicleId: value,
              }))
            }
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue
                placeholder={
                  vehiclesQuery.isLoading
                    ? "Carregando veículos..."
                    : "Selecione"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {availableVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {getVehicleLabel(vehicle)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Validade</Label>

          <Input
            type="date"
            className="h-11"
            value={form.validUntil}
            onChange={onChange("validUntil")}
          />
        </div>
      </div>
    </section>
  );
}