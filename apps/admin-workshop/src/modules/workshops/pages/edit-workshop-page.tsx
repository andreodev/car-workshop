"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Ban, Building2, CheckCircle2, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CustomDomainPanel } from "../components/custom-domain-panel";
import { WorkshopForm } from "../components/workshop-form";
import { useWorkshopAdminActions } from "../hooks/use-workshop-admin-actions";
import { useUpdateWorkshop } from "../hooks/use-update-workshop";
import { useWorkshop } from "../hooks/use-workshop";
import {
  defaultCustomizationColors,
  type Workshop,
  type WorkshopFormValues,
} from "../types/workshop.types";

type EditWorkshopPageProps = {
  id: string;
};

export function EditWorkshopPage({ id }: EditWorkshopPageProps) {
  const { data: workshop, isLoading, isError, error } = useWorkshop(id);
  const updateWorkshop = useUpdateWorkshop(id);
  const adminActions = useWorkshopAdminActions(id);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold">Editar oficina</h1>
              <p className="text-sm text-muted-foreground">
                Dados cadastrais e identidade visual da oficina.
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

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="mb-2 size-4" />
            <AlertTitle>Erro ao carregar oficina</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Tente novamente em instantes."}
            </AlertDescription>
          </Alert>
        ) : null}

        {workshop ? (
          <>
            {workshop.status === "SUSPENDED" ? (
              <Alert variant="destructive">
                <Ban className="mb-2 size-4" />
                <AlertTitle>Oficina bloqueada</AlertTitle>
                <AlertDescription>
                  Esta oficina não pode ser acessada no app da oficina enquanto estiver bloqueada.
                </AlertDescription>
              </Alert>
            ) : null}

            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Administração da oficina</CardTitle>
                  <CardDescription>
                    Controle o acesso ao tenant ou apague o cadastro quando não houver dados vinculados.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {workshop.status === "SUSPENDED" ? (
                  <Button
                    type="button"
                    onClick={() => adminActions.updateStatus.mutate("ACTIVE")}
                    disabled={adminActions.isPending}
                  >
                    <CheckCircle2 />
                    Reativar oficina
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => adminActions.updateStatus.mutate("SUSPENDED")}
                    disabled={adminActions.isPending}
                  >
                    <Ban />
                    Bloquear oficina
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja apagar esta oficina?")) {
                      adminActions.remove.mutate();
                    }
                  }}
                  disabled={adminActions.isPending}
                >
                  <Trash2 />
                  Apagar oficina
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{workshop.name}</CardTitle>
                <CardDescription>
                  Alterações no slug impactam a URL padrão da oficina.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkshopForm
                  defaultValues={toFormValues(workshop)}
                  onSubmit={(values) => updateWorkshop.mutate({ id, values })}
                  isSubmitting={updateWorkshop.isPending}
                  submitLabel="Salvar alterações"
                />
              </CardContent>
            </Card>

            <section className="grid gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold">Domínio e DNS</h2>
                <p className="text-sm text-muted-foreground">
                  Configure o domínio próprio da oficina e valide o apontamento.
                </p>
              </div>
              <CustomDomainPanel workshop={workshop} />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function toFormValues(workshop: Workshop): WorkshopFormValues {
  const customization = workshop.customization ?? {};

  return {
    name: workshop.name,
    slug: workshop.slug,
    legalName: workshop.legalName,
    tradeName: workshop.tradeName ?? "",
    document: workshop.document ?? "",
    email: workshop.email ?? "",
    phone: workshop.phone ?? "",
    customDomain: workshop.customDomain ?? "",
    logoUrl: workshop.logoUrl ?? "",
    primaryColor:
      customization.primaryColor ?? defaultCustomizationColors.primaryColor,
    secondaryColor:
      customization.secondaryColor ?? defaultCustomizationColors.secondaryColor,
    imageUrl: customization.imageUrl ?? "",
    customizationName: customization.name ?? workshop.name,
    customizationSlug: customization.slug ?? workshop.slug,
  };
}
