export type ServiceOrder = {
  id: string;
  customerId: string;
  vehicleId: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELED";
  totalAmount: number;
  createdAt: string;
};
