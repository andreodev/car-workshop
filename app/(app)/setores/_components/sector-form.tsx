"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createSector, updateSector } from "../../pdv/pdv-api";
import type { Sector, SectorFormValues } from "../../pdv/types";
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
import { useToast } from "@/components/ui/toast";

type SectorFormProps = {
  initialData?: Sector | null;
};

function mapSectorToForm(sector?: Sector | null): SectorFormValues {
  return {
    name: sector?.name ?? "",
    active: sector?.active ?? true,
    notes: sector?.notes ?? "",
  };
}

export function SectorForm({ initialData }: SectorFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SectorFormValues>(() => mapSectorToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "edit" && initialData) {
        return updateSector(initialData.id, form);
      }

      return createSector(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-sectors"] });
      toast({
        title: mode === "edit" ? "Setor atualizado" : "Setor cadastrado",
        description: "Os dados foram salvos com sucesso.",
        variant: "success",
      });
      router.push("/setores");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar o setor.";
      setLocalError(message);
      toast({
        title: "Erro ao salvar setor",
        description: message,
        variant: "destructive",
      });
    },
  });

  function updateField<Key extends keyof SectorFormValues>(
    key: Key,
    value: SectorFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.name.trim()) {
      setLocalError("Nome é obrigatório.");
      return;
    }

    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold">
          {mode === "edit" ? "Editar setor" : "Cadastrar setor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Os setores ativos aparecem no seletor do PDV.
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
        <Button type="button" variant="outline" onClick={() => router.push("/setores")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
