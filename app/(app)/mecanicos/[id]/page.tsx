"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMechanic } from "../mechanic-api";
import { MechanicForm } from "../_components/mechanic-form";

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
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando mecânico...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o mecânico."}
      </div>
    );
  }

  return <MechanicForm initialData={data} />;
}
