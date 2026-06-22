// hooks/use-estimate-options.ts

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchClients } from "@/modules/client/api/client.service";
import { fetchMechanics } from "@/app/(app)/mecanicos/mechanic-api";
import { vehiclesService } from "@/modules/vehicle/api/vehicle.service";
import {
  fetchAllCatalogItems,
  fetchSectors,
} from "@/modules/pdv/api/pdv.service";

import type { EstimateItemFormValues } from "../types/estimate.types";

type UseEstimateOptionsParams = {
  mode: "create" | "edit";
  clientId: string;
  vehicleId: string;
  items: EstimateItemFormValues[];
};

export function useEstimateOptions({
  mode,
  clientId,
  vehicleId,
  items,
}: UseEstimateOptionsParams) {
  const clientsQuery = useQuery({
    queryKey: ["estimate-clients"],
    queryFn: () => fetchClients({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["estimate-vehicles"],
    queryFn: () => vehiclesService.list({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });

  const mechanicsQuery = useQuery({
    queryKey: ["estimate-mechanics", { includeInactive: mode === "edit" }],
    queryFn: () =>
      fetchMechanics({
        page: 1,
        pageSize: 50,
        includeInactive: mode === "edit",
      }),
    staleTime: 60_000,
  });

  const sectorsQuery = useQuery({
    queryKey: ["estimate-sectors", { includeInactive: mode === "edit" }],
    queryFn: () =>
      fetchSectors({
        page: 1,
        pageSize: 50,
        includeInactive: mode === "edit",
      }),
    staleTime: 60_000,
  });

  const catalogItemsQuery = useQuery({
    queryKey: ["estimate-catalog-items"],
    queryFn: () => fetchAllCatalogItems(),
    staleTime: 60_000,
  });

  const catalogItems = useMemo(
    () => catalogItemsQuery.data?.items ?? [],
    [catalogItemsQuery.data],
  );

  const mechanics = useMemo(
    () => mechanicsQuery.data?.items ?? [],
    [mechanicsQuery.data],
  );

  const sectors = useMemo(
    () => sectorsQuery.data?.items ?? [],
    [sectorsQuery.data],
  );

  const availableVehicles = useMemo(() => {
    const vehicles = vehiclesQuery.data?.items ?? [];

    if (!clientId) {
      return vehicles;
    }

    return vehicles.filter((vehicle) => vehicle.clientId === clientId);
  }, [vehiclesQuery.data, clientId]);

  const selectedClient = useMemo(() => {
    return (clientsQuery.data?.items ?? []).find(
      (client) => client.id === clientId,
    );
  }, [clientsQuery.data, clientId]);

  const selectedVehicle = useMemo(() => {
    return (vehiclesQuery.data?.items ?? []).find(
      (vehicle) => vehicle.id === vehicleId,
    );
  }, [vehiclesQuery.data, vehicleId]);

  const selectedMechanic = useMemo(() => {
    const firstItemMechanicId =
      items.find((item) => item.type === "SERVICE" && item.mechanicId)
        ?.mechanicId ?? "";

    return mechanics.find((mechanic) => mechanic.id === firstItemMechanicId);
  }, [mechanics, items]);

  const isLoadingOptions =
    clientsQuery.isLoading ||
    vehiclesQuery.isLoading ||
    mechanicsQuery.isLoading ||
    sectorsQuery.isLoading ||
    catalogItemsQuery.isLoading;

  return {
    clientsQuery,
    vehiclesQuery,
    mechanicsQuery,
    sectorsQuery,
    catalogItemsQuery,

    catalogItems,
    mechanics,
    sectors,

    availableVehicles,
    selectedClient,
    selectedVehicle,
    selectedMechanic,

    isLoadingOptions,
  };
}