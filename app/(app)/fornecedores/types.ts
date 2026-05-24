export type SupplierPersonType = "FISICA" | "JURIDICA";

export type Supplier = {
  id: string;
  code: number;
  personType: SupplierPersonType;
  name: string;
  cpf: string | null;
  rg: string | null;
  contact: string | null;
  productLine: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  email: string | null;
  website: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  neighborhood: string | null;
  bank: string | null;
  account: string | null;
  agency: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierListResponse = {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
};

export type SupplierFormValues = {
  personType: SupplierPersonType;
  name: string;
  cpf: string;
  rg: string;
  contact: string;
  productLine: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  email: string;
  website: string;
  cep: string;
  city: string;
  state: string;
  address: string;
  neighborhood: string;
  bank: string;
  account: string;
  agency: string;
  notes: string;
};

export type SupplierOrderStatus = "ABERTO" | "RECEBIDO" | "CANCELADO";

export type SupplierOrder = {
  id: string;
  code: number;
  status: SupplierOrderStatus;
  supplierId: string;
  supplier?: Pick<Supplier, "id" | "code" | "name" | "productLine"> | null;
  employee: string;
  forecastAt: string;
  invoiceNumber: string | null;
  observation: string | null;
  internalDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierOrderListResponse = {
  items: SupplierOrder[];
  total: number;
  page: number;
  pageSize: number;
};

export type SupplierOrderFormValues = {
  supplierId: string;
  status: SupplierOrderStatus;
  employee: string;
  forecastAt: string;
  invoiceNumber: string;
  observation: string;
  internalDescription: string;
};
