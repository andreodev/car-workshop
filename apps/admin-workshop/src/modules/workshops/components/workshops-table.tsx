"use client";

import Link from "next/link";
import { CalendarDays, Globe2, Pencil, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { WorkshopSummary } from "../types/workshop.types";
import { formatDocument, formatTenantStatus } from "../utils/workshop-formatters";

const rootDomain =
  process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ??
  process.env.NEXT_PUBLIC_PLATFORM_APP_DOMAIN ??
  "meudominio.com.br";

function formatCustomDomainStatus(status: WorkshopSummary["customDomainStatus"]) {
  if (status === "VERIFIED") {
    return { label: "Verificado", variant: "default" as const };
  }
  if (status === "ERROR") {
    return { label: "Erro DNS", variant: "destructive" as const };
  }
  return { label: "DNS pendente", variant: "outline" as const };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type WorkshopsTableProps = {
  workshops: WorkshopSummary[];
};

export function WorkshopsTable({ workshops }: WorkshopsTableProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {workshops.map((workshop) => {
        const domainStatus = formatCustomDomainStatus(workshop.customDomainStatus);
        const domain = workshop.customDomain ?? `${workshop.slug}.${rootDomain}`;

        return (
          <Card key={workshop.id} className="flex min-h-72 flex-col">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{workshop.name}</CardTitle>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{workshop.slug}</p>
                </div>
                <Badge
                  variant={
                    workshop.status === "SUSPENDED"
                      ? "destructive"
                      : workshop.status === "ACTIVE"
                        ? "default"
                        : "outline"
                  }
                >
                  {formatTenantStatus(workshop.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="grid flex-1 gap-4">
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Razão social</span>
                <span className="truncate text-sm font-medium">{workshop.legalName}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDocument(workshop.document)}
                </span>
              </div>

              <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe2 className="size-4 text-muted-foreground" />
                  <span className="min-w-0 truncate">{domain}</span>
                </div>
                <Badge variant={domainStatus.variant} className="w-fit">
                  {domainStatus.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span>{workshop.usersCount} usuários</span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span>{formatDate(workshop.createdAt)}</span>
                </div>
              </div>
            </CardContent>

            <div className="border-t border-border p-4 pt-4">
              <Button asChild className="w-full">
                <Link href={`/oficinas/${workshop.id}`}>
                  <Pencil />
                  Editar oficina
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
