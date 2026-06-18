
import { api } from "@/shared/api";
import type {
  Vehicle,
  VehicleFormValues,
  VehicleListResponse,
} from "../types/vehicle.types";

export type VehicleListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export const vehiclesService = {
  async list(params: VehicleListParams) {
    const { data } = await api.get<VehicleListResponse>("/vehicles", {
      params,
    });

    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<Vehicle>(`/vehicles/${id}`);

    return data;
  },

  async create(payload: VehicleFormValues) {
    const { data } = await api.post<Vehicle>("/vehicles", payload);

    return data;
  },

  async update(id: string, payload: VehicleFormValues) {
    const { data } = await api.put<Vehicle>(`/vehicles/${id}`, payload);

    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<{ ok: boolean }>(`/vehicles/${id}`);

    return data;
  },
};