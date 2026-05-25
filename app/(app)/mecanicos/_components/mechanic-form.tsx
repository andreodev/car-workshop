"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";

import { createMechanic, updateMechanic } from "../mechanic-api";
import { mechanicFormSchema } from "../mechanic-form-schema";
import type { Mechanic, MechanicFormValues } from "../types";
import Header from "@/components/ui/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/toast";

type MechanicFormProps = {
  initialData?: Mechanic | null;
};

function mapMechanicToForm(mechanic?: Mechanic | null): MechanicFormValues {
  return {
    name: mechanic?.name ?? "",
    active: mechanic?.active ?? true,
    commissionPercent: mechanic?.commissionPercent ?? "0",
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
  const { toast } = useToast();

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
      toast({
        title: mode === "edit" ? "Mecanico atualizado" : "Mecanico cadastrado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });
      router.push("/mecanicos");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar o mecânico.";
      setLocalError(message);
      toast({
        title: "Erro ao salvar mecanico",
        description: message,
        variant: "destructive",
      });
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

  const isSaving = mutation.isPending;
  const errorMessage = localError ?? (mutation.error ? mutation.error.message : null);

  return (
    <section className="flex min-h-[calc(100vh-8rem)] w-full flex-col">
      <form onSubmit={handleSubmit} className="flex w-full flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-8">
          <Header
            title={mode === "edit" ? "Editar mecânico" : "Cadastro de mecânico"}
            description="Mecânicos ativos ficam disponíveis nas ordens de serviço e orçamentos."
          />

          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mechanic-name">Nome</Label>
                  <Input
                    id="mechanic-name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mechanic-status">Situação</Label>
                  <Select
                    value={form.active ? "ATIVO" : "INATIVO"}
                    onValueChange={(value) => updateField("active", value === "ATIVO")}
                  >
                    <SelectTrigger id="mechanic-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mechanic-commission">Comissão sobre serviços (%)</Label>
                  <Input
                    id="mechanic-commission"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    type="number"
                    value={form.commissionPercent}
                    onChange={(event) => updateField("commissionPercent", event.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mechanic-notes">Observações</Label>
                  <Textarea
                    id="mechanic-notes"
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </div>
              </div>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro ao salvar mecânico</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col items-stretch justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Revise os dados antes de salvar. O mecânico ficará disponível para os demais
              módulos do sistema.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.push("/mecanicos")}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={isSaving} className="gap-2">
                {isSaving ? <Spinner size="sm" /> : null}
                {isSaving ? "Salvando..." : "Salvar mecânico"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
