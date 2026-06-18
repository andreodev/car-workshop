import type {
  CatalogItemsParams,
  SalesParams,
  SectorsParams,
} from "./pdv.service";

export const pdvKeys = {
  catalogItems: () => ["pdv-catalog-items"] as const,
  catalogItemsList: (params: CatalogItemsParams) =>
    [...pdvKeys.catalogItems(), "list", params] as const,

  sectors: () => ["pdv-sectors"] as const,
  sectorsList: (params: SectorsParams) =>
    [...pdvKeys.sectors(), "list", params] as const,

  sales: () => ["sales"] as const,
  salesList: (params: SalesParams) =>
    [...pdvKeys.sales(), "list", params] as const,

  serviceOrders: () => ["service-orders"] as const,
};
