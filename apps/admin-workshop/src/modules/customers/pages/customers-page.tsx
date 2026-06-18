"use client";

import { AlertCircle, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CustomersTable } from "../components/customers-table";
import { useCustomers } from "../hooks/use-customers";

export function CustomersPage() {
  const { data, isLoading, isError, error } = useCustomers({ page: 1, pageSize: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="mb-2 size-4" />
        <AlertTitle>Erro ao carregar clientes</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Tente novamente em instantes."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.items.length) {
    return (
      <Card>
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-2 text-center">
          <Search className="size-8 text-muted-foreground" />
          <CardTitle>Nenhum cliente encontrado</CardTitle>
          <p className="max-w-sm text-sm text-muted-foreground">
            A listagem ja esta conectada ao service HTTP. Os registros aparecem
            aqui quando a API Golang responder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <CustomersTable customers={data.items} />;
}
