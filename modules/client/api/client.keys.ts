import type { ClientListParams } from "./client.service";

export const clientsKeys = {
  all: ["clients"] as const,

  lists: () => [...clientsKeys.all, "list"] as const,

  list: (params: ClientListParams) => [...clientsKeys.lists(), params] as const,

  details: () => [...clientsKeys.all, "detail"] as const,

  detail: (id: string) => [...clientsKeys.details(), id] as const,
};
