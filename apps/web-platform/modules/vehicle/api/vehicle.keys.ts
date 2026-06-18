import type { VehicleListParams } from "./vehicle.service";

export const vehiclesKeys = {
  all: ["vehicles"] as const,

  lists: () => [...vehiclesKeys.all, "list"] as const,

  list: (params: VehicleListParams) =>
    [...vehiclesKeys.lists(), params] as const,

  details: () => [...vehiclesKeys.all, "detail"] as const,

  detail: (id: string) => [...vehiclesKeys.details(), id] as const,
};