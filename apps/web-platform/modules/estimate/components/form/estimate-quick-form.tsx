import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { maskCurrencyInput } from "@/modules/pdv/utils/pdv-sale-utils";
import { normalizeAmount } from "../../utils/estimate-form-utils";
import type { Dispatch, SetStateAction } from "react";
import type { QuickCatalogDialogState, QuickCatalogFormValues } from "../../types/estimate.types";
import type { CatalogItem } from "@/modules/pdv/types/pdv.types";

interface QuickDialogProps {
    quickCatalogDialog: any,
  isQuickCatalogSaving: any,
  setQuickCatalogDialog: Dispatch<SetStateAction<QuickCatalogDialogState>>,
  setQuickCatalogForm: Dispatch<SetStateAction<QuickCatalogFormValues>>,
  emptyQuickCatalogForm: any,
  quickCatalogMutation: any,
  quickDialogItemType: any,
  quickCatalogForm: any,
  quickDialogCatalogItem: any,
  productCatalogItems: any,
  quickDialogItem: any,
}

export function QuickDialog({
  quickCatalogDialog,
  isQuickCatalogSaving,
  setQuickCatalogDialog,
  setQuickCatalogForm,
  emptyQuickCatalogForm,
  quickCatalogMutation,
  quickDialogItemType,
  quickCatalogForm,
  quickDialogCatalogItem,
  productCatalogItems,
  quickDialogItem,
} : QuickDialogProps) {
  return (
    <Dialog
      open={Boolean(quickCatalogDialog)}
      onOpenChange={(open) => {
        if (!open && !isQuickCatalogSaving) {
          setQuickCatalogDialog(null);
          setQuickCatalogForm(emptyQuickCatalogForm);
          quickCatalogMutation.reset();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {quickCatalogDialog?.mode === "create"
              ? quickDialogItemType === "SERVICE"
                ? "Cadastrar serviço"
                : "Cadastrar produto"
              : "Adicionar estoque"}
          </DialogTitle>
          <DialogDescription>
            {quickCatalogDialog?.mode === "create"
              ? quickDialogItemType === "SERVICE"
                ? "Crie o serviço e selecione-o automaticamente neste orçamento."
                : "Crie o produto e selecione-o automaticamente neste orçamento."
              : "Selecione um produto existente e informe a quantidade que entrou no estoque."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {quickCatalogDialog?.mode === "create" ? (
            <>
              <div className="grid gap-2">
                <Label>
                  {quickDialogItemType === "SERVICE"
                    ? "Nome do serviço"
                    : "Nome do produto"}
                </Label>
                <Input
                  value={quickCatalogForm.name}
                  onChange={(event) =>
                    setQuickCatalogForm((prev) => ({
                      ...prev,
                      name: event.target.value.toUpperCase(),
                    }))
                  }
                  autoFocus
                />
              </div>
              <div
                className={
                  quickDialogItemType === "PRODUCT"
                    ? "grid gap-3 sm:grid-cols-3"
                    : "grid gap-3 sm:grid-cols-2"
                }
              >
                {quickDialogItemType === "PRODUCT" ? (
                  <div className="grid gap-2">
                    <Label>Estoque inicial</Label>
                    <Input
                      inputMode="decimal"
                      value={quickCatalogForm.quantity}
                      onChange={(event) =>
                        setQuickCatalogForm((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>Valor unitário</Label>
                  <Input
                    inputMode="decimal"
                    value={quickCatalogForm.unitPrice}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        unitPrice: maskCurrencyInput(event.target.value),
                      }))
                    }
                  />

                  <p>{maskCurrencyInput("")}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Input
                    value={quickCatalogForm.unit}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        unit: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>
              {quickDialogItemType === "PRODUCT" ? (
                <div className="grid gap-2">
                  <Label>Estoque mínimo</Label>
                  <Input
                    inputMode="decimal"
                    value={quickCatalogForm.stockMinimum}
                    onChange={(event) =>
                      setQuickCatalogForm((prev) => ({
                        ...prev,
                        stockMinimum: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Produto existente</Label>
                <Select
                  value={quickDialogCatalogItem?.id ?? ""}
                  onValueChange={(value) =>
                    setQuickCatalogDialog((prev) =>
                      prev?.mode === "stock"
                        ? { ...prev, catalogItemId: value }
                        : prev,
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCatalogItems.map((catalogItem : CatalogItem) => (
                      <SelectItem key={catalogItem.id} value={catalogItem.id}>
                        #{catalogItem.code} {catalogItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {quickDialogCatalogItem?.name ?? "Produto selecionado"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estoque atual:{" "}
                  {normalizeAmount(quickDialogCatalogItem?.stockCurrent ?? "0")}
                  . Quantidade no orçamento:{" "}
                  {normalizeAmount(quickDialogItem?.quantity ?? "0")}.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Quantidade para adicionar</Label>
                <Input
                  inputMode="decimal"
                  value={quickCatalogForm.quantity}
                  onChange={(event) =>
                    setQuickCatalogForm((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Observação</Label>
                <Textarea
                  value={quickCatalogForm.notes}
                  onChange={(event) =>
                    setQuickCatalogForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </>
          )}

          {quickCatalogMutation.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {quickCatalogMutation.error instanceof Error
                ? quickCatalogMutation.error.message
                : "Não foi possível salvar."}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isQuickCatalogSaving}
            onClick={() => {
              setQuickCatalogDialog(null);
              setQuickCatalogForm(emptyQuickCatalogForm);
              quickCatalogMutation.reset();
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isQuickCatalogSaving}
            onClick={() => quickCatalogMutation.mutate()}
          >
            {isQuickCatalogSaving
              ? "Salvando..."
              : quickCatalogDialog?.mode === "create"
                ? quickDialogItemType === "SERVICE"
                  ? "Cadastrar serviço"
                  : "Cadastrar produto"
                : "Adicionar estoque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
