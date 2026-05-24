"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { fetchClients } from "../../clientes/client-api";
import { createVehicle, updateVehicle } from "../vehicle-api";
import type { Vehicle, VehicleFormValues } from "../types";
import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";
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

const inputClassName = "h-11 bg-background text-sm";
const textareaClassName = "min-h-28 bg-background text-sm";

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

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-5 border-t border-border/70 pt-8 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h3 className="font-heading text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

type InputFieldProps = {
  field: keyof VehicleFormValues;
  label: string;
  onChange: (field: keyof VehicleFormValues) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
};

function InputField({
  field,
  label,
  onChange,
  value,
  placeholder,
  required,
  type,
}: InputFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type={type}
        value={value}
        onChange={onChange(field)}
        placeholder={placeholder}
        required={required}
        className={inputClassName}
      />
    </div>
  );
}

export function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleFormValues>(() =>
    initialData ? mapVehicleToForm(initialData) : emptyForm
  );
  const [localError, setLocalError] = useState<string | null>(null);

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
      setLocalError(null);
    };

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
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: "ATIVO", label: "Ativo" },
      { value: "INATIVO", label: "Inativo" },
    ],
    []
  );

  function updateField(field: keyof VehicleFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setLocalError(null);
  }

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

    mutation.mutate({ ...form, plate: form.plate.trim().toUpperCase() });
  }

  const clients = clientsQuery.data?.items ?? [];

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8">
          <Header
            title={mode === "edit" ? "Editar veículo" : "Cadastro de veículo"}
            description="Preencha os dados do veículo para salvar no sistema."
          />

          <div className="space-y-8 bg-white/60 rounded-3xl border-2 border-gray-700 p-6">
            <FormSection
              title="Vínculo e situação"
              description="Associe o veículo ao cliente e defina se ele segue ativo nos atendimentos."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(value) => updateField("clientId", value)}
                  >
                    <SelectTrigger className={inputClassName}>
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
                      Não foi possível carregar clientes.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label>Situação</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      updateField("status", value as VehicleFormValues["status"])
                    }
                  >
                    <SelectTrigger className={inputClassName}>
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
            </FormSection>

            <FormSection
              title="Identificação"
              description="Informe placa, marca, modelo e características básicas do veículo."
            >
              <div className="grid gap-4 md:grid-cols-4">
                <InputField
                  field="plate"
                  label="Placa"
                  value={form.plate}
                  onChange={onChange}
                  placeholder="AAA-0000"
                  required
                />
                <InputField field="brand" label="Marca" value={form.brand} onChange={onChange} />
                <InputField field="model" label="Modelo" value={form.model} onChange={onChange} />
                <InputField field="version" label="Versão" value={form.version} onChange={onChange} />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <InputField
                  field="manufactureYear"
                  label="Ano fabricação"
                  value={form.manufactureYear}
                  onChange={onChange}
                  type="number"
                />
                <InputField
                  field="modelYear"
                  label="Ano modelo"
                  value={form.modelYear}
                  onChange={onChange}
                  type="number"
                />
                <div className="grid gap-2">
                  <Label>Combustível</Label>
                  <Select
                    value={form.fuel}
                    onValueChange={(value) =>
                      updateField("fuel", value as VehicleFormValues["fuel"])
                    }
                  >
                    <SelectTrigger className={inputClassName}>
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
                <InputField field="color" label="Cor" value={form.color} onChange={onChange} />
              </div>
            </FormSection>

            <FormSection
              title="Dados técnicos"
              description="Registre informações úteis para consulta em ordens e orçamentos."
            >
              <div className="grid gap-4 md:grid-cols-4">
                <InputField field="fleet" label="Frota" value={form.fleet} onChange={onChange} />
                <InputField field="chassis" label="Chassi" value={form.chassis} onChange={onChange} />
                <InputField field="renavam" label="Renavam" value={form.renavam} onChange={onChange} />
                <InputField field="engine" label="Motor" value={form.engine} onChange={onChange} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InputField field="city" label="Cidade" value={form.city} onChange={onChange} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={onChange("notes")}
                  className={textareaClassName}
                />
              </div>
            </FormSection>

            {errorMessage ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Revise os dados antes de salvar. O veículo ficará disponível para os demais módulos do sistema.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.push("/veiculos")}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar veículo"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
