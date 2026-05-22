"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { fetchClients } from "./client-api";
import type { ClientStatus } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

type StatusFilter = ClientStatus | "TODOS";

export default function ClientsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clients", { page, status, search }],
    queryFn: () => fetchClients({ page, pageSize: PAGE_SIZE, status, search }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatus(value as StatusFilter);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Gerencie seus clientes cadastrados.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">Cadastrar cliente</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, CPF ou telefone"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Situacao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as situacoes</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando clientes...
          </div>
        ) : null}

        {isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar clientes."}
          </div>
        ) : null}

        {data && data.items.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Situacao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.cpf ?? "-"}</TableCell>
                    <TableCell>{client.city ?? "-"}</TableCell>
                    <TableCell>
                      {client.mobile ?? client.phoneResidential ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === "ATIVO" ? "default" : "secondary"}>
                        {client.status === "ATIVO" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clientes/${client.id}`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="text-xs text-muted-foreground">
            Pagina {data?.page ?? page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Proxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
