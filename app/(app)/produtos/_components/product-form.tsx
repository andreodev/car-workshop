"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createCatalogItem, updateCatalogItem } from "../../pdv/pdv-api";
import type { CatalogItem, CatalogItemFormValues, CatalogItemType } from "../../pdv/types";
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

type ProductFormProps = {
  initialData?: CatalogItem | null;
};

function mapItemToForm(item?: CatalogItem | null): CatalogItemFormValues {
  return {
    name: item?.name ?? "",
    type: item?.type ?? "PRODUTO",
    sku: item?.sku ?? "",
    unitPrice: item?.unitPrice ? String(item.unitPrice) : "",
    active: item?.active ?? true,
    notes: item?.notes ?? "",
  };
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CatalogItemFormValues>(() => mapItemToForm(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const mode = initialData ? "edit" : "create";

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "edit" && initialData) {
        return updateCatalogItem(initialData.id, form);
      }

      return createCatalogItem({
        name: form.name,
        type: form.type,
        sku: form.sku || null,
        unitPrice: parseMoney(form.unitPrice),
        active: form.active,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["pdv-catalog-items"] });
      router.push("/produtos");
    },
    onError: (error) => {
      setLocalError(
        error instanceof Error ? error.message : "Nao foi possivel salvar o cadastro."
      );
    },
  });

  function updateField<Key extends keyof CatalogItemFormValues>(
    key: Key,
    value: CatalogItemFormValues[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.name.trim()) {
      setLocalError("Nome e obrigatorio.");
      return;
    }

    if (!Number.isFinite(parseMoney(form.unitPrice)) || parseMoney(form.unitPrice) < 0) {
      setLocalError("Valor unitario invalido.");
      return;
    }

    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold">
          {mode === "edit" ? "Editar produto/servico" : "Cadastrar produto/servico"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Esses itens ficam disponiveis para pesquisa no PDV.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(value) => updateField("type", value as CatalogItemType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVICO">Servico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Situacao</Label>
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
        <div className="space-y-2">
          <Label>Codigo/SKU</Label>
          <Input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Valor unitario (R$)</Label>
          <Input
            value={form.unitPrice}
            onChange={(event) => updateField("unitPrice", event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observacoes</Label>
          <Textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/produtos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
