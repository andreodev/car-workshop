import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  clientsService,
  type ClientListParams,
} from "../api/client.service";
import { clientsKeys } from "../api/client.keys";

export function useClients(params: ClientListParams) {
  return useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => clientsService.list(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
