"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { SupplierForm } from "../_components/supplier-form";
import { fetchSupplier } from "../supplier-api";

type EditSupplierPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => fetchSupplier(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando fornecedor...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o fornecedor."}
      </div>
    );
  }

  return <SupplierForm initialData={data} />;
}
