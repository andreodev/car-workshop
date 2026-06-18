"use client";

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { WorkshopForm } from "../components/workshop-form";
import { useCreateWorkshop } from "../hooks/use-create-workshop";

export function CreateWorkshopPage() {
  const createWorkshop = useCreateWorkshop();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold">Nova oficina</h1>
              <p className="text-sm text-muted-foreground">
                Cria um tenant em status Trial via API Go.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href="/oficinas">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Dados da oficina</CardTitle>
            <CardDescription>
              O slug define a URL padrao da oficina; dominio personalizado pode ser apontado depois via DNS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkshopForm
              onSubmit={(values) => createWorkshop.mutate(values)}
              isSubmitting={createWorkshop.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
