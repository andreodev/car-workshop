import Link from "next/link";
import { Download } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import Header from "@/components/ui/header";
import { Button } from "@/components/ui/button";

type ReportPageProps = {
  title: string;
  description: string;
  exportType: string;
  children: ReactNode;
};

export function ReportPage({ title, description, exportType, children }: ReportPageProps) {
  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <Header title={title} description={description} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/relatorios">Voltar</Link>
          </Button>
          <Button asChild>
            <a href={`/api/reports/export?type=${exportType}`}>
              <Download className="size-3.5" />
              Exportar CSV
            </a>
          </Button>
        </div>
      </div>
      {children}
    </section>
  );
}

export function ReportMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-700 uppercase text-muted-foreground">{label}</p>
          <strong className="mt-2 block font-heading text-2xl font-800 text-foreground">
            {value}
          </strong>
          {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

export function EmptyReportState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
