"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import type { CatalogItem } from "@/modules/pdv/types/pdv.types";
import { formatStock } from "@/modules/pdv/utils/pdv-sale-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type CatalogItemComboboxType = "PRODUCT" | "SERVICE";

type CatalogItemComboboxProps = {
  items: CatalogItem[];
  value: string;
  type: CatalogItemComboboxType;
  loading?: boolean;
  placeholder?: string;
  manualLabel?: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
};

function catalogTypeFromItemType(type: CatalogItemComboboxType) {
  return type === "PRODUCT" ? "PRODUTO" : "SERVICO";
}

function getCatalogItemLabel(item: CatalogItem) {
  return `#${item.code} ${item.name}`;
}

export function CatalogItemCombobox({
  items,
  value,
  type,
  loading = false,
  placeholder,
  manualLabel,
  emptyLabel,
  onChange,
}: CatalogItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.id === value);
  const catalogType = catalogTypeFromItemType(type);
  const filteredItems = items.filter((item) => item.type === catalogType);
  const triggerLabel = selectedItem
    ? getCatalogItemLabel(selectedItem)
    : placeholder ?? (type === "PRODUCT" ? "Selecione produto" : "Selecione serviço");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "h-11 w-full justify-between px-3 font-normal",
            !selectedItem && "text-muted-foreground"
          )}
          disabled={loading}
        >
          <span className="min-w-0 truncate text-left">
            {loading ? "Carregando..." : triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput placeholder="Buscar por código, nome ou SKU..." />
          <CommandList>
            <CommandEmpty>
              {emptyLabel ?? "Nenhum item encontrado."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="manual sem vinculo catalogo"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("size-4", !value ? "opacity-100" : "opacity-0")} />
                {manualLabel ?? (type === "PRODUCT" ? "Selecione produto" : "Manual")}
              </CommandItem>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={[
                    item.id,
                    item.code,
                    item.name,
                    item.sku,
                    item.barcode,
                    item.originalCode,
                    item.manufacturerCode,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{getCatalogItemLabel(item)}</span>
                  {item.type === "PRODUTO" ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      Est. {formatStock(item.stockCurrent) ?? "0"}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
