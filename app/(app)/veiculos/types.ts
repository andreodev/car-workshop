export type VehicleFuel =
  | "GASOLINA"
  | "ETANOL"
  | "DIESEL"
  | "FLEX"
  | "GNV"
  | "ELETRICO"
  | "HIBRIDO";

export type VehicleStatus = "ATIVO" | "INATIVO";

export type VehicleSearchBy = "PLACA" | "MARCA" | "MODELO" | "CLIENTE" | "CODIGO";

export type Vehicle = {
  id: string;
  code: number;
  clientId: string;
  plate: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  fleet: string | null;
  fuel: VehicleFuel | null;
  color: string | null;
  chassis: string | null;
  renavam: string | null;
  engine: string | null;
  city: string | null;
  status: VehicleStatus;
  manufactureYear: number | null;
  modelYear: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  } | null;
};

export type VehicleListResponse = {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
};

export type VehicleFormValues = {
  clientId: string;
  plate: string;
  brand: string;
  model: string;
  version: string;
  fleet: string;
  fuel: VehicleFuel;
  color: string;
  chassis: string;
  renavam: string;
  engine: string;
  city: string;
  status: VehicleStatus;
  manufactureYear: string;
  modelYear: string;
  notes: string;
};
