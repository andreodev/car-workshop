import { useMemo, useState } from "react";
import { useVehicles } from "./use-vehile";


const PAGE_SIZE = 10;

export function useVehiclesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const query = useVehicles({
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const totalPages = useMemo(() => {
    if (!query.data) return 1;

    return Math.max(1, Math.ceil(query.data.total / query.data.pageSize));
  }, [query.data]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  return {
    ...query,
    page,
    setPage,
    search,
    searchInput,
    setSearchInput,
    totalPages,
    handleSearch,
    handleClearSearch,
  };
}