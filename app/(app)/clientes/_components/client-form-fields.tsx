"use client";

import type { ChangeEventHandler, ComponentProps } from "react";

import type { ClientFormErrors } from "../client-form-utils";
import type { ClientFormValues } from "../types";
import { inputClassName, textareaClassName } from "./client-form-constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError as UiFieldError,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

type InputState = {
  "aria-invalid": boolean;
};

export type ClientFormFieldProps = {
  form: ClientFormValues;
  fieldErrors: ClientFormErrors;
  onChange: (
    field: keyof ClientFormValues
  ) => ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onSelectChange: (field: keyof ClientFormValues, value: string) => void;
  getInputState: (field: keyof ClientFormValues) => InputState;
};

type FieldErrorProps = {
  error?: string;
};

export function FieldError({ error }: FieldErrorProps) {
  if (!error) {
    return null;
  }

  return <UiFieldError>{error}</UiFieldError>;
}

type ClientInputFieldProps = Omit<ComponentProps<typeof Input>, "form" | "onChange" | "value"> & {
  field: keyof ClientFormValues;
  helperText?: string;
  helperTone?: "error" | "muted";
  label: string;
  wrapperClassName?: string;
} & ClientFormFieldProps;

export function ClientInputField({
  field,
  label,
  form,
  fieldErrors,
  getInputState,
  helperText,
  helperTone = "muted",
  onChange,
  onSelectChange: _onSelectChange,
  wrapperClassName = "grid gap-2",
  className = inputClassName,
  ...inputProps
}: ClientInputFieldProps) {
  void _onSelectChange;

  return (
    <Field className={wrapperClassName}>
      <Label htmlFor={field}>{label}</Label>
      <FieldControl>
        <Input
          id={field}
          value={form[field]}
          onChange={onChange(field)}
          className={className}
          {...getInputState(field)}
          {...inputProps}
        />
      </FieldControl>
      <FieldError error={fieldErrors[field]} />
      {helperText ? (
        <FieldDescription
          className={cn(
            helperTone === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {helperText}
        </FieldDescription>
      ) : null}
    </Field>
  );
}

type ClientTextareaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  "form" | "onChange" | "value"
> & {
  field: keyof ClientFormValues;
  label: string;
} & ClientFormFieldProps;

export function ClientTextareaField({
  field,
  label,
  form,
  fieldErrors,
  getInputState,
  onChange,
  className = textareaClassName,
  ...textareaProps
}: ClientTextareaFieldProps) {
  return (
    <Field>
      <Label htmlFor={field}>{label}</Label>
      <FieldControl>
        <Textarea
          id={field}
          value={form[field]}
          onChange={onChange(field)}
          className={className}
          {...getInputState(field)}
          {...textareaProps}
        />
      </FieldControl>
      <FieldError error={fieldErrors[field]} />
    </Field>
  );
}

type ClientSelectFieldProps = {
  field: keyof ClientFormValues;
  label: string;
  options: Array<{ value: string; label: string }>;
} & Pick<ClientFormFieldProps, "form" | "fieldErrors" | "getInputState" | "onSelectChange">;

export function ClientSelectField({
  field,
  label,
  options,
  form,
  fieldErrors,
  getInputState,
  onSelectChange,
}: ClientSelectFieldProps) {
  return (
    <Field>
      <Label>{label}</Label>
      <Select value={form[field]} onValueChange={(value) => onSelectChange(field, value)}>
        <FieldControl>
          <SelectTrigger className={inputClassName} {...getInputState(field)}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
        </FieldControl>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError error={fieldErrors[field]} />
    </Field>
  );
}
