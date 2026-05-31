import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { pdvKeys } from "../api/pdv.keys";
import { fetchSales, updateSaleStatus } from "../api/pdv.service";
import type {
  Sale,
  SaleStatus,
  ServiceOrderCompleted,
} from "../types/pdv.types";

const PAGE_SIZE = 10;

export type SalesStatusFilter = SaleStatus | "TODOS";

export function useSalesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SalesStatusFilter>("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedServiceOrderId, setExpandedServiceOrderId] = useState<
    string | null
  >(null);
  const [pdvOpen, setPdvOpen] = useState(false);
  const [selectedServiceOrder, setSelectedServiceOrder] =
    useState<ServiceOrderCompleted | null>(null);

  const queryParams = {
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    from,
    to,
  };

  const query = useQuery({
    queryKey: pdvKeys.salesList(queryParams),
    queryFn: () => fetchSales(queryParams),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const serviceOrdersCompleted = useMemo(() => {
    return query.data?.serviceOrdersCompleted ?? [];
  }, [query.data?.serviceOrdersCompleted]);

  const cancelMutation = useMutation({
    mutationFn: (sale: Sale) => updateSaleStatus(sale.id, "CANCELADA"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdvKeys.sales() });
    },
  });

  const totalPages = useMemo(() => {
    if (!query.data) {
      return 1;
    }

    return Math.max(1, Math.ceil(query.data.total / query.data.pageSize));
  }, [query.data]);

  const pageTotal = useMemo(() => {
    return (
      query.data?.items.reduce((sum, sale) => {
        if (sale.status === "CANCELADA") {
          return sum;
        }

        return sum + Number(sale.total);
      }, 0) ?? 0
    );
  }, [query.data]);

  const canceledCount = useMemo(() => {
    return (
      query.data?.items.filter((sale) => sale.status === "CANCELADA").length ??
      0
    );
  }, [query.data]);

  const serviceOrdersPendingPaymentTotal = useMemo(() => {
    return serviceOrdersCompleted.reduce((sum, order) => {
      return sum + Number(order.total);
    }, 0);
  }, [serviceOrdersCompleted]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleOpenNormalPdv() {
    setSelectedServiceOrder(null);
    setPdvOpen(true);
  }

  function handlePayServiceOrder(order: ServiceOrderCompleted) {
    setSelectedServiceOrder(order);
    setPdvOpen(true);
  }

  function handleClosePdv() {
    setPdvOpen(false);
    setSelectedServiceOrder(null);
    queryClient.invalidateQueries({ queryKey: pdvKeys.sales() });
  }

  return {
    ...query,
    cancelMutation,
    canceledCount,
    expandedId,
    expandedServiceOrderId,
    from,
    handleClosePdv,
    handleOpenNormalPdv,
    handlePayServiceOrder,
    handleSearch,
    page,
    pageTotal,
    pdvOpen,
    searchInput,
    selectedServiceOrder,
    serviceOrdersCompleted,
    serviceOrdersPendingPaymentTotal,
    setExpandedId,
    setExpandedServiceOrderId,
    setFrom,
    setPage,
    setSearchInput,
    setStatus,
    setTo,
    status,
    to,
    totalPages,
  };
}
