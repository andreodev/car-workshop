"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CashierIcon, Invoice01Icon } from "@hugeicons/core-free-icons";

import { PdvSaleDialog } from "./pdv-sale-dialog";
import { Button } from "@/components/ui/button";

type PdvHomeProps = {
  defaultResponsible: string;
};

export function PdvHome({ defaultResponsible }: PdvHomeProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 rounded-md border bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Venda balcao
          </p>
          <h1 className="text-2xl font-semibold">PDV</h1>
          <p className="text-sm text-muted-foreground">
            Abra o caixa pelo botao abaixo ou usando F2 em qualquer tela.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setOpen(true)}>
            <HugeiconsIcon icon={CashierIcon} strokeWidth={2.5} />
            Abrir PDV
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pdv/vendas">
              <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2.5} />
              Listar vendas
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Atalho</p>
          <p className="text-lg font-semibold">F2</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Operador</p>
          <p className="text-lg font-semibold">{defaultResponsible}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Modo</p>
          <p className="text-lg font-semibold">Caixa livre</p>
        </div>
      </div>

      <PdvSaleDialog
        open={open}
        defaultResponsible={defaultResponsible}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
