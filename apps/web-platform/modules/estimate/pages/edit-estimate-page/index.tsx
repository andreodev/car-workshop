"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { EstimateForm } from "../../components/estimate-form";
import { fetchEstimate } from "../../api/estimate.service";

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
        Carregando orçamento...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Não foi possível carregar o orçamento.
      </div>
    );
  }

  return <EstimateForm mode="edit" initialData={data} />;
}
