"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { clientsKeys } from "../../api/client.keys";
import { clientsService } from "../../api/client.service";
import { ClientForm } from "../../components/client-form";

type ClientEditPageProps = {
  id: string;
};

export default function ClientEditPage({ id }: ClientEditPageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: () => clientsService.findById(id),
    enabled: Boolean(id),
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
