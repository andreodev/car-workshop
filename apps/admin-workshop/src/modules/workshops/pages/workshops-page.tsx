"use client";

import Link from "next/link";
import { AlertCircle, Building2, Plus, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoutButton } from "@/modules/auth/components/logout-button";

import { WorkshopsTable } from "../components/workshops-table";
import { useWorkshops } from "../hooks/use-workshops";

export function WorkshopsPage() {
  const { data, isLoading, isError, error } = useWorkshops({ limit: 20, offset: 0 });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold">Oficinas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os tenants/oficinas do whitelabel.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <LogoutButton />
            <Button asChild>
              <Link href="/oficinas/nova">
                <Plus />
                Nova oficina
              </Link>
            </Button>
          </div>
        </header>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="grid gap-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="mb-2 size-4" />
            <AlertTitle>Erro ao carregar oficinas</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Tente novamente em instantes."}
            </AlertDescription>
          </Alert>
        ) : null}

        {data && data.data.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <Search className="size-8 text-muted-foreground" />
              <CardTitle>Nenhuma oficina cadastrada</CardTitle>
              <CardDescription>
                Cadastre a primeira oficina para criar o tenant no banco compartilhado.
              </CardDescription>
              <Button asChild className="mt-2">
                <Link href="/oficinas/nova">Criar oficina</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data && data.data.length > 0 ? <WorkshopsTable workshops={data.data} /> : null}
      </div>
    </main>
  );
}
