"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCatalogItem } from "@/modules/pdv/api/pdv.service";
import { ProductForm } from "../_components/product-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

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
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner size="sm" className="text-primary" />
        Carregando item...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTitle>Erro ao carregar item</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Não foi possível carregar o item."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ProductForm initialData={data} />;
}
