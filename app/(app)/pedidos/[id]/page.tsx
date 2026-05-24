"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { SupplierOrderForm } from "../../fornecedores/_components/supplier-order-form";
import { fetchSupplierOrder } from "../../fornecedores/supplier-api";

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
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando pedido...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Não foi possível carregar o pedido."}
      </div>
    );
  }

  return <SupplierOrderForm initialData={data} />;
}
