"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { EstimateForm } from "../_components/estimate-form";
import { fetchEstimate } from "../estimate-api";

type EstimateEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EstimateEditPage({ params }: EstimateEditPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["estimate", id],
    queryFn: () => fetchEstimate(id),
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando orcamento...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Nao foi possivel carregar o orcamento.
      </div>
    );
  }

  return <EstimateForm mode="edit" initialData={data} />;
}
