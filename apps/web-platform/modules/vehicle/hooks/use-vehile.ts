import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  vehiclesService,
  type VehicleListParams,
} from "../api/vehicle.service";
import { vehiclesKeys } from "../api/vehicle.keys";

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: vehiclesKeys.list(params),
    queryFn: () => vehiclesService.list(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}