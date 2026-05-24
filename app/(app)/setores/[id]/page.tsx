"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchSector } from "../../pdv/pdv-api";
import { SectorForm } from "../_components/sector-form";

type EditSectorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditSectorPage({ params }: EditSectorPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sector", id],
    queryFn: () => fetchSector(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando setor...</div>;
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o setor."}
      </div>
    );
  }

  return <SectorForm initialData={data} />;
}
