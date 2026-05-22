"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCatalogItem } from "../../pdv/pdv-api";
import { ProductForm } from "../_components/product-form";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog-item", id],
    queryFn: () => fetchCatalogItem(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando item...</div>;
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Nao foi possivel carregar o item."}
      </div>
    );
  }

  return <ProductForm initialData={data} />;
}
