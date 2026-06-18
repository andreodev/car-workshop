"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMechanic } from "../mechanic-api";
import { MechanicForm } from "../_components/mechanic-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type EditMechanicPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditMechanicPage({ params }: EditMechanicPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mechanic", id],
    queryFn: () => fetchMechanic(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner size="sm" className="text-primary" />
        Carregando mecânico...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTitle>Erro ao carregar mecânico</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Não foi possível carregar o mecânico."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <MechanicForm initialData={data} />;
}
