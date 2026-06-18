"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomersPage } from "@/modules/customers/pages/customers-page";

import { DashboardShell } from "../components/dashboard-shell";
import { useDashboardMetrics } from "../hooks/use-dashboard-metrics";

export function DashboardPage() {
  const { data, isFetching, refetch } = useDashboardMetrics();

  return (
    <DashboardShell>
      <section className="grid gap-4 md:grid-cols-3">
        {isFetching && !data
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : data?.map((metric) => (
              <Card key={metric.label}>
                <CardHeader>
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-3xl">{metric.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{metric.helper}</p>
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">Clientes</h2>
            <p className="text-sm text-muted-foreground">
              Exemplo inicial com service, hook, loading, empty e error state.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>

        <CustomersPage />
      </section>
    </DashboardShell>
  );
}
