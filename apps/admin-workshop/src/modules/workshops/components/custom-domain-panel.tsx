"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Globe2, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useCustomDomainActions } from "../hooks/use-custom-domain-actions";
import type { CustomDomainRecord, Workshop } from "../types/workshop.types";

type CustomDomainPanelProps = {
  workshop: Workshop;
};

const rootDomain =
  process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ??
  process.env.NEXT_PUBLIC_PLATFORM_APP_DOMAIN ??
  "meudominio.com.br";

const cnameTarget = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET ?? "cname.vercel-dns.com";

function formatStatus(status: Workshop["customDomainStatus"]) {
  if (status === "VERIFIED") {
    return { label: "Verificado", variant: "default" as const, icon: CheckCircle2 };
  }
  if (status === "ERROR") {
    return { label: "Erro", variant: "destructive" as const, icon: XCircle };
  }
  return { label: "Pendente", variant: "outline" as const, icon: Loader2 };
}

function DNSRecord({ record }: { record: CustomDomainRecord }) {
  const copy = () => {
    navigator.clipboard.writeText(`${record.type} ${record.name} ${record.value}`);
    toast.success("Registro copiado.");
  };

  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm sm:grid-cols-[88px_1fr_auto] sm:items-center">
      <Badge variant="secondary">{record.type}</Badge>
      <div className="min-w-0">
        <div className="truncate font-medium">{record.name}</div>
        <div className="truncate text-muted-foreground">{record.value}</div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy />
        Copiar
      </Button>
    </div>
  );
}

export function CustomDomainPanel({ workshop }: CustomDomainPanelProps) {
  const [customDomain, setCustomDomain] = useState(workshop.customDomain ?? "");
  const actions = useCustomDomainActions(workshop.id);
  const status = formatStatus(workshop.customDomainStatus);
  const StatusIcon = status.icon;

  const records = useMemo<CustomDomainRecord[]>(() => {
    const items: CustomDomainRecord[] = [];
    if (customDomain.trim()) {
      items.push({
        type: "CNAME",
        name: customDomain.trim(),
        value: cnameTarget,
      });
    }
    if (workshop.customDomainVerificationToken) {
      items.push({
        type: "TXT",
        name: "_workshop-verification",
        value: workshop.customDomainVerificationToken,
      });
    }
    return items;
  }, [customDomain, workshop.customDomainVerificationToken]);

  const submit = () => {
    actions.update.mutate(customDomain);
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="size-4" />
            {workshop.name}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Subdomínio padrão: {workshop.slug}.{rootDomain}
          </p>
        </div>
        <Badge variant={status.variant} className="gap-1">
          <StatusIcon className="size-3" />
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={customDomain}
            onChange={(event) => setCustomDomain(event.target.value)}
            placeholder="app.oficina.com.br"
            disabled={actions.isPending}
          />
          <Button type="button" onClick={submit} disabled={actions.isPending || !customDomain.trim()}>
            Salvar domínio
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.verify.mutate()}
            disabled={actions.isPending || !workshop.customDomain}
          >
            Verificar DNS
          </Button>
        </div>

        {records.length > 0 ? (
          <div className="grid gap-2">
            {records.map((record) => (
              <DNSRecord key={`${record.type}-${record.name}`} record={record} />
            ))}
          </div>
        ) : null}

        {workshop.customDomainLastError ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {workshop.customDomainLastError}
          </p>
        ) : null}

        {workshop.customDomain ? (
          <div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => actions.remove.mutate()}
              disabled={actions.isPending}
            >
              <Trash2 />
              Remover domínio personalizado
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
