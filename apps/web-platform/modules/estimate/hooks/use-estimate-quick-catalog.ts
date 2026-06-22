import type {
  CatalogItem,
  CatalogItemListResponse,
} from "@/modules/pdv/types/pdv.types";
import { useQueryClient } from "@tanstack/react-query";

export function useEstimeQuickCatalog(CatalogItem   : CatalogItem[]) {
  const catalog = CatalogItem
  const queryClient = useQueryClient();

  //revisar pois quando testei os dados chegam até a function mergeCatalogItemCaches
  //mas a variável catalog diz não está sendo usado em nenhum momento
  
  function mergeCatalogItemIntoCaches(catalog: CatalogItem)  {
    const updater = (data: CatalogItemListResponse | undefined) => {
      if (!data) return data;

      const exists = data.items.some((item) => item.id === catalog.id);
      const items = exists
        ? data.items.map((item) =>
            item.id === catalog.id ? catalog : item,
          )
        : [catalog, ...data.items];

      return {
        ...data,
        items,
        total: exists ? data.total : Math.max(data.total + 1, items.length),
      };
    };

    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["estimate-catalog-items"] },
      updater,
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["catalog-items"] },
      updater,
    );
    queryClient.setQueriesData<CatalogItemListResponse>(
      { queryKey: ["pdv-catalog-items"] },
      updater,
    );
  }

  return {
    mergeCatalogItemIntoCaches,
  };
}
