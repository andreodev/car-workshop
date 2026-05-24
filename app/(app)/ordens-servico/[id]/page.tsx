"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchServiceOrder } from "../service-order-api";
import { ServiceOrderForm } from "../_components/service-order-form";

type ServiceOrderEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ServiceOrderEditPage({ params }: ServiceOrderEditPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["service-order", id],
    queryFn: () => fetchServiceOrder(id),
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando ordem de serviço...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Não foi possível carregar a ordem de serviço.
      </div>
    );
  }

  return <ServiceOrderForm mode="edit" initialData={data} />;
}
