"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchClient } from "../client-api";
import { ClientForm } from "../_components/client-form";

type ClientEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ClientEditPage({ params }: ClientEditPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClient(id),
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando cliente...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Não foi possível carregar o cliente.
      </div>
    );
  }

  return <ClientForm mode="edit" initialData={data} />;
}
