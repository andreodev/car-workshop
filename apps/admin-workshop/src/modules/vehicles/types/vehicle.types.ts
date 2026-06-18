export type Vehicle = {
  id: string;
  customerId: string;
  plate: string;
  model: string;
  brand?: string | null;
  year?: number | null;
};
