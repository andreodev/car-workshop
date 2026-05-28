"use client";

import { useMutation } from "@tanstack/react-query";

import { VehicleForm } from "../components/vehicle-form";
import { vehiclesService } from "../api/vehicle.service";
import type { VehicleFormValues } from "../types/vehicle.types";

export default function VehicleCreatePage() {

  return (
    <VehicleForm
      mode="create"
    />
  );
}