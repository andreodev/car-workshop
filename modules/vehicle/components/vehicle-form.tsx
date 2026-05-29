"use client";

import type { Vehicle } from "../types/vehicle.types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { FormLoadingState } from "@/components/ui/form-loading-state";
import Header from "@/components/ui/header";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { useVehicleForm } from "../hooks/use-vehicle-form";
import { VehicleFormSection } from "./vehicle-form-section";
import { VehicleInputField } from "./vehicle-input-field";

const inputClassName = "h-9 bg-background text-sm";
const textareaClassName = "min-h-28 resize-y bg-background text-sm";

type VehicleFormProps = {
  mode: "create" | "edit";
  initialData?: Vehicle | null;
};

const brands = [
  { value: "toyota", label: "Toyota" },
  { value: "honda", label: "Honda" },
  { value: "ford", label: "Ford" },
  { value: "chevrolet", label: "Chevrolet" },
  { value: "volkswagen", label: "Volkswagen" },
  { value: "nissan", label: "Nissan" },
  { value: "hyundai", label: "Hyundai" },
  { value: "kia", label: "Kia" },
  { value: "renault", label: "Renault" },
  { value: "peugeot", label: "Peugeot" },
  { value: "fiat", label: "Fiat" },
  { value: "citroen", label: "Citroën" },
];

export function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const {
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
  } = useVehicleForm({
    mode,
    initialData,
  });

  if (clientsQuery.isLoading) {
    return (
      <FormLoadingState
        title="Carregando cadastro de veículo..."
      />
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8">
          <Header
            title={mode === "edit" ? "Editar veículo" : "Cadastro de veículo"}
            description="Preencha os dados do veículo para salvar no sistema."
          />

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-8 pt-6">
              <VehicleFormSection
                title="Vínculo e situação"
                description="Associe o veículo ao cliente e defina se ele segue ativo nos atendimentos."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field className="md:col-span-2">
                    <Label>Cliente</Label>

                    <Select
                      value={form.clientId}
                      onValueChange={(value) => updateField("clientId", value)}
                    >
                      <FieldControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue
                            placeholder={
                              clientsQuery.isLoading
                                ? "Carregando clientes..."
                                : "Selecione"
                            }
                          />
                        </SelectTrigger>
                      </FieldControl>

                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {clientsQuery.isError ? (
                      <FieldError>
                        Não foi possível carregar clientes.
                      </FieldError>
                    ) : null}
                  </Field>

                  <Field>
                    <Label>Situação</Label>

                    <Select
                      value={form.status}
                      onValueChange={(value) => updateField("status", value)}
                    >
                      <FieldControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FieldControl>

                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </VehicleFormSection>

              <VehicleFormSection
                title="Identificação"
                description="Informe placa, marca, modelo e características básicas do veículo."
              >
                <div className="grid gap-4 md:grid-cols-4">
                  <VehicleInputField
                    field="plate"
                    label="Placa"
                    value={form.plate}
                    onChange={onChange}
                    placeholder="AAA-0000"
                    required
                  />

                 <Select>
                    <Field>
                      <Label>Marca</Label>

                      <FieldControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FieldControl>

                      <SelectContent>
                        {brands.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Field>
                  </Select>

                  <VehicleInputField
                    field="model"
                    label="Modelo"
                    value={form.model}
                    onChange={onChange}
                  />

                  <VehicleInputField
                    field="version"
                    label="Versão"
                    value={form.version}
                    onChange={onChange}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
<VehicleInputField
  field="manufactureYear"
  label="Ano fabricação"
  value={form.manufactureYear}
  onChange={onChange}
  type="text"
  placeholder="11/12"
  mask="manufactureDate"
/>

                  <Field>
                    <Label>Combustível</Label>

                    <Select
                      value={form.fuel}
                      onValueChange={(value) => updateField("fuel", value)}
                    >
                      <FieldControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FieldControl>

                      <SelectContent>
                        {fuelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <VehicleInputField
                    field="color"
                    label="Cor"
                    value={form.color}
                    onChange={onChange}
                  />
                </div>
              </VehicleFormSection>

              <VehicleFormSection
                title="Dados técnicos"
                description="Registre informações úteis para consulta em ordens e orçamentos."
              >
                <div className="grid gap-4 md:grid-cols-4">
                  <VehicleInputField
                    field="fleet"
                    label="Frota"
                    value={form.fleet}
                    onChange={onChange}
                  />

                  <VehicleInputField
                    field="chassis"
                    label="Chassi"
                    value={form.chassis}
                    onChange={onChange}
                  />

                  <VehicleInputField
                    field="renavam"
                    label="Renavam"
                    value={form.renavam}
                    onChange={onChange}
                  />

                  <VehicleInputField
                    field="engine"
                    label="Motor"
                    value={form.engine}
                    onChange={onChange}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <VehicleInputField
                    field="city"
                    label="Cidade"
                    value={form.city}
                    onChange={onChange}
                  />
                </div>

                <Field>
                  <Label htmlFor="notes">Observações</Label>

                  <FieldControl>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={onChange("notes")}
                      className={textareaClassName}
                    />
                  </FieldControl>

                  <FieldDescription>
                    Informações adicionais para o atendimento.
                  </FieldDescription>
                </Field>
              </VehicleFormSection>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro ao salvar veículo</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Revise os dados antes de salvar. O veículo ficará disponível para
              os demais módulos do sistema.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleCancel}
              >
                Cancelar
              </Button>

              <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                {isSaving ? <Spinner size="sm" /> : null}
                {isSaving ? "Salvando..." : "Salvar veículo"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
