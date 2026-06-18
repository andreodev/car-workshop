"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { WorkshopSummary } from "../types/workshop.types";
import { formatDocument, formatTenantStatus } from "../utils/workshop-formatters";

const rootDomain =
  process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ??
  process.env.NEXT_PUBLIC_PLATFORM_APP_DOMAIN ??
  "meudominio.com.br";

function formatCustomDomainStatus(status: WorkshopSummary["customDomainStatus"]) {
  if (status === "VERIFIED") {
    return "Verificado";
  }
  if (status === "ERROR") {
    return "Erro";
  }
  return "Pendente";
}

const columns: ColumnDef<WorkshopSummary>[] = [
  {
    accessorKey: "name",
    header: "Oficina",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.slug}</div>
      </div>
    ),
  },
  {
    accessorKey: "legalName",
    header: "Razao social",
  },
  {
    accessorKey: "customDomain",
    header: "Dominio",
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="font-medium">
          {row.original.customDomain ?? `${row.original.slug}.${rootDomain}`}
        </div>
        <Badge
          variant={
            row.original.customDomainStatus === "VERIFIED"
              ? "default"
              : row.original.customDomainStatus === "ERROR"
                ? "destructive"
                : "outline"
          }
        >
          {formatCustomDomainStatus(row.original.customDomainStatus)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "document",
    header: "Documento",
    cell: ({ row }) => formatDocument(row.original.document),
  },
  {
    accessorKey: "usersCount",
    header: "Usuarios",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
        {formatTenantStatus(row.original.status)}
      </Badge>
    ),
  },
];

type WorkshopsTableProps = {
  workshops: WorkshopSummary[];
};

export function WorkshopsTable({ workshops }: WorkshopsTableProps) {
  // TanStack Table exposes function references that React Compiler cannot memoize safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: workshops,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/60 hover:bg-muted/60">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
