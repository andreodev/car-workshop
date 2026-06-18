"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { SupplierOrderForm } from "../../fornecedores/_components/supplier-order-form";
import { fetchSupplierOrder } from "../../fornecedores/supplier-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type EditSupplierOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditSupplierOrderPage({ params }: EditSupplierOrderPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supplier-order", id],
    queryFn: () => fetchSupplierOrder(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner size="sm" className="text-primary" />
        Carregando pedido...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTitle>Erro ao carregar pedido</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Não foi possível carregar o pedido."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <SupplierOrderForm initialData={data} />;
}
