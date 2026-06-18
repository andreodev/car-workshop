import type { ChangeEvent } from "react";

import { Field, FieldControl } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { VehicleFormValues } from "../types/vehicle.types";

const inputClassName = "h-9 bg-background text-sm";

type VehicleInputFieldProps = {
  field: keyof VehicleFormValues;
  label: string;
  value: string;
  onChange: (
    field: keyof VehicleFormValues,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  mask?: "manufactureDate";
};

function maskManufactureDate(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 4);

  if (numbers.length <= 2) return numbers;

  return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
}

export function VehicleInputField({
  field,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  mask,
}: VehicleInputFieldProps) {
  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (!mask) {
      onChange(field)(event);
      return;
    }

    const maskedValue =
      mask === "manufactureDate"
        ? maskManufactureDate(event.target.value)
        : event.target.value;

    event.target.value = maskedValue;

    onChange(field)(event);
  }

  return (
    <Field>
      <Label htmlFor={field}>{label}</Label>

      <FieldControl>
        <Input
          id={field}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={inputClassName}
        />
      </FieldControl>
    </Field>
  );
}