"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { fetchClients } from "../../clientes/client-api";
import { createVehicle, updateVehicle } from "../vehicle-api";
import type { Vehicle, VehicleFormValues } from "../types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyForm: VehicleFormValues = {
  clientId: "",
  plate: "",
  brand: "",
  model: "",
  version: "",
  fleet: "",
  fuel: "GASOLINA",
  color: "",
  chassis: "",
  renavam: "",
  engine: "",
  city: "",
  status: "ATIVO",
  manufactureYear: "",
  modelYear: "",
  notes: "",
};

function mapVehicleToForm(vehicle: Vehicle): VehicleFormValues {
  return {
    clientId: vehicle.clientId,
    plate: vehicle.plate ?? "",
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    version: vehicle.version ?? "",
    fleet: vehicle.fleet ?? "",
    fuel: vehicle.fuel ?? "GASOLINA",
    color: vehicle.color ?? "",
    chassis: vehicle.chassis ?? "",
    renavam: vehicle.renavam ?? "",
    engine: vehicle.engine ?? "",
    city: vehicle.city ?? "",
    status: vehicle.status ?? "ATIVO",
    manufactureYear: vehicle.manufactureYear ? String(vehicle.manufactureYear) : "",
    modelYear: vehicle.modelYear ? String(vehicle.modelYear) : "",
    notes: vehicle.notes ?? "",
  };
}

type VehicleFormProps = {
  mode: "create" | "edit";
  initialData?: Vehicle | null;
};

export function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleFormValues>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm(mapVehicleToForm(initialData));
    }
  }, [initialData]);

  const clientsQuery = useQuery({
    queryKey: ["vehicle-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      if (mode === "edit" && initialData?.id) {
        return updateVehicle(initialData.id, values);
      }
      return createVehicle(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/veiculos");
      router.refresh();
    },
  });

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  const onChange = (field: keyof VehicleFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const fuelOptions = useMemo(
    () => [
      { value: "GASOLINA", label: "Gasolina" },
      { value: "ETANOL", label: "Etanol" },
      { value: "DIESEL", label: "Diesel" },
      { value: "FLEX", label: "Flex" },
      { value: "GNV", label: "GNV" },
      { value: "ELETRICO", label: "Eletrico" },
      { value: "HIBRIDO", label: "Hibrido" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: "ATIVO", label: "Ativo" },
      { value: "INATIVO", label: "Inativo" },
    ],
    []
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.clientId) {
      setLocalError("Selecione o cliente.");
      return;
    }

    if (!form.plate.trim()) {
      setLocalError("Placa e obrigatoria.");
      return;
    }

    mutation.mutate({ ...form, plate: form.plate.trim() });
  }

  const clients = clientsQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Editar veiculo" : "Cadastrar veiculo"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-2">
              <Label>Cliente</Label>
              <Select
                value={form.clientId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, clientId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      clientsQuery.isLoading
                        ? "Carregando clientes..."
                        : "Selecione"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clientsQuery.isError ? (
                <p className="text-xs text-destructive">
                  Nao foi possivel carregar clientes.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Situacao</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as VehicleFormValues["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={form.plate}
                onChange={onChange("plate")}
                placeholder="AAA-0000"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" value={form.brand} onChange={onChange("brand")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" value={form.model} onChange={onChange("model")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">Versao</Label>
              <Input id="version" value={form.version} onChange={onChange("version")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="manufactureYear">Ano fab</Label>
              <Input
                id="manufactureYear"
                type="number"
                value={form.manufactureYear}
                onChange={onChange("manufactureYear")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="modelYear">Ano mod</Label>
              <Input
                id="modelYear"
                type="number"
                value={form.modelYear}
                onChange={onChange("modelYear")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fuel">Combustivel</Label>
              <Select
                value={form.fuel}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    fuel: value as VehicleFormValues["fuel"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {fuelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Cor</Label>
              <Input id="color" value={form.color} onChange={onChange("color")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="fleet">Frota</Label>
              <Input id="fleet" value={form.fleet} onChange={onChange("fleet")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chassis">Chassi</Label>
              <Input id="chassis" value={form.chassis} onChange={onChange("chassis")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="renavam">Renavam</Label>
              <Input id="renavam" value={form.renavam} onChange={onChange("renavam")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="engine">Motor</Label>
              <Input id="engine" value={form.engine} onChange={onChange("engine")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={form.city} onChange={onChange("city")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Obs</Label>
            <Textarea id="notes" value={form.notes} onChange={onChange("notes")} />
          </div>

          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/veiculos")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
