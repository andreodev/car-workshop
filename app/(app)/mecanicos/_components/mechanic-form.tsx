"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";

import { createMechanic, updateMechanic } from "../mechanic-api";
import { mechanicFormSchema } from "../mechanic-form-schema";
import type { Mechanic, MechanicFormValues } from "../types";
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

type MechanicFormProps = {
  initialData?: Mechanic | null;
};

function mapMechanicToForm(mechanic?: Mechanic | null): MechanicFormValues {
  return {
    name: mechanic?.name ?? "",
    active: mechanic?.active ?? true,
    notes: mechanic?.notes ?? "",
  };
}

function formatZodError(error: ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export function MechanicForm({ initialData }: MechanicFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MechanicFormValues>(() => mapMechanicToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = mechanicFormSchema.safeParse(form);

      if (!parsed.success) {
        throw new Error(formatZodError(parsed.error));
      }

      if (mode === "edit" && initialData) {
        return updateMechanic(initialData.id, parsed.data);
      }

      return createMechanic(parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
      queryClient.invalidateQueries({ queryKey: ["service-order-mechanics"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-mechanics"] });
      router.push("/mecanicos");
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Não foi possível salvar o mecânico."
      );
    },
  });

  function updateField<Key extends keyof MechanicFormValues>(
    key: Key,
    value: MechanicFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setLocalError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold">
          {mode === "edit" ? "Editar mecânico" : "Cadastrar mecânico"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Mecânicos ativos ficam disponíveis nas ordens de serviço e orçamentos.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Situação</Label>
          <Select
            value={form.active ? "ATIVO" : "INATIVO"}
            onValueChange={(value) => updateField("active", value === "ATIVO")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="INATIVO">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/mecanicos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
