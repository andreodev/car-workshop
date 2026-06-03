import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import type { ClientStatus } from "../types/client.types";
import { useClients } from "./use-clients";

const PAGE_SIZE = 10;

export type ClientStatusFilter = ClientStatus | "TODOS";

export function useClientsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ClientStatusFilter>("TODOS");
  const [statusInput, setStatusInput] = useState<ClientStatusFilter>("TODOS");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const query = useClients({
    page,
    pageSize: PAGE_SIZE,
    status,
    search,
  });

  const totalPages = useMemo(() => {
    if (!query.data) return 1;

    return Math.max(1, Math.ceil(query.data.total / query.data.pageSize));
  }, [query.data]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setStatus(statusInput);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatusInput(value as ClientStatusFilter);
  }

  function handleClearSearch() {
    setPage(1);
    setStatus("TODOS");
    setStatusInput("TODOS");
    setSearch("");
    setSearchInput("");
  }

  return {
    ...query,
    page,
    setPage,
    status,
    statusInput,
    search,
    searchInput,
    setSearchInput,
    totalPages,
    handleSearch,
    handleStatusChange,
    handleClearSearch,
  };
}
