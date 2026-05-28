"use client";

import { useQuery } from "@tanstack/react-query";
import { VehicleForm } from "../components/vehicle-form";
import { vehiclesService } from "../api/vehicle.service";

type VehicleEditPageProps = {
  id: string;
};

export default function VehicleEditPage({ id }: VehicleEditPageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => vehiclesService.findById(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <div>Carregando veículo...</div>;

  if (isError || !data) return <div>Não foi possível carregar o veículo.</div>;

  return <VehicleForm mode="edit" initialData={data} />;
}