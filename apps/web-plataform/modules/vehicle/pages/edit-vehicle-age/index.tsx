"use client";

import { useQuery } from "@tanstack/react-query";

import { vehiclesService } from "../../api/vehicle.service";
import { VehicleForm } from "../../components/vehicle-form";

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
