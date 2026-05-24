"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchVehicle } from "../vehicle-api";
import { VehicleForm } from "../_components/vehicle-form";

type VehicleEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function VehicleEditPage({ params }: VehicleEditPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => fetchVehicle(id),
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando veículo...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Não foi possível carregar o veículo.
      </div>
    );
  }

  return <VehicleForm mode="edit" initialData={data} />;
}
