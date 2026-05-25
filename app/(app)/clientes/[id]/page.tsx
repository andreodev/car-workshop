"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchClient } from "../client-api";
import { ClientForm } from "../_components/client-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

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
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner size="sm" className="text-primary" />
        Carregando cliente...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTitle>Erro ao carregar cliente</AlertTitle>
          <AlertDescription>Não foi possível carregar o cliente.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ClientForm mode="edit" initialData={data} />;
}
