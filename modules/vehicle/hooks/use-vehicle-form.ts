import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { fetchClients } from "@/app/(app)/clientes/client-api";

import type { Vehicle, VehicleFormValues } from "../types/vehicle.types";
import { vehiclesService } from "../api/vehicle.service";
import { vehiclesKeys } from "../api/vehicle.keys";

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
    manufactureYear: vehicle.manufactureYear
      ? String(vehicle.manufactureYear)
      : "",
    modelYear: vehicle.modelYear ? String(vehicle.modelYear) : "",
    notes: vehicle.notes ?? "",
  };
}

type UseVehicleFormParams = {
  mode: "create" | "edit";
  initialData?: Vehicle | null;
};

export function useVehicleForm({ mode, initialData }: UseVehicleFormParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<VehicleFormValues>(() =>
    initialData ? mapVehicleToForm(initialData) : emptyForm,
  );

  const [localError, setLocalError] = useState<string | null>(null);

  const [date, setDate] = useState<Date>()


  const clientsQuery = useQuery({
    queryKey: ["vehicle-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      if (mode === "edit" && initialData?.id) {
        return vehiclesService.update(initialData.id, values);
      }

      return vehiclesService.create(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vehiclesKeys.all,
      });

      toast({
        title: mode === "edit" ? "Veículo atualizado" : "Veículo cadastrado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });

      router.push("/veiculos");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o veículo.";

      setLocalError(message);

      toast({
        title: "Erro ao salvar veículo",
        description: message,
        variant: "destructive",
      });
    },
  });

  const fuelOptions = useMemo(
    () => [
      { value: "GASOLINA", label: "Gasolina" },
      { value: "ETANOL", label: "Etanol" },
      { value: "DIESEL", label: "Diesel" },
      { value: "FLEX", label: "Flex" },
      { value: "GNV", label: "GNV" },
      { value: "ELETRICO", label: "Elétrico" },
      { value: "HIBRIDO", label: "Híbrido" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "ATIVO", label: "Ativo" },
      { value: "INATIVO", label: "Inativo" },
    ],
    [],
  );

  const clients = clientsQuery.data?.items ?? [];
  const isSaving = mutation.isPending;
  const errorMessage =
    localError ?? (mutation.error instanceof Error ? mutation.error.message : null);

  function updateField(field: keyof VehicleFormValues, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setLocalError(null);
  }

  const onChange =
    (field: keyof VehicleFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value);
    };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.clientId) {
      setLocalError("Selecione o cliente.");
      return;
    }

    if (!form.plate.trim()) {
      setLocalError("Placa é obrigatória.");
      return;
    }

    mutation.mutate({
      ...form,
      plate: form.plate.trim().toUpperCase(),
    });
  }

  function handleCancel() {
    router.push("/veiculos");
  }

  return {
    form,
    clients,
    clientsQuery,
    fuelOptions,
    statusOptions,
    isSaving,
    errorMessage,
    updateField,
    onChange,
    handleSubmit,
    handleCancel,
    date,
    setDate
  };
}