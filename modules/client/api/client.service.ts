import { api } from "@/shared/api";
import type {
  Client,
  ClientFormValues,
  ClientListResponse,
} from "../types/client.types";

export type ClientListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export const clientsService = {
  async list(params: ClientListParams) {
    const { data } = await api.get<ClientListResponse>("/clients", {
      params,
    });

    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<Client>(`/clients/${id}`);

    return data;
  },

  async create(payload: ClientFormValues) {
    const { data } = await api.post<Client>("/clients", payload);

    return data;
  },

  async update(id: string, payload: ClientFormValues) {
    const { data } = await api.put<Client>(`/clients/${id}`, payload);

    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<{ ok: boolean }>(`/clients/${id}`);

    return data;
  },
};

export const fetchClients = clientsService.list;
export const fetchClient = clientsService.findById;
export const createClient = clientsService.create;
export const updateClient = clientsService.update;
export const deleteClient = clientsService.remove;
