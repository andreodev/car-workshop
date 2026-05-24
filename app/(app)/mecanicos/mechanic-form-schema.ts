import { z } from "zod";

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no máximo ${max} caracteres.`,
    });

export const mechanicFormSchema = z.object({
  name: textField("Nome", 120).refine((value) => value.length > 0, {
    message: "Nome é obrigatório.",
  }),
  active: z.boolean({ error: "Situação inválida." }),
  notes: textField("Observações", 1000),
});

export type MechanicFormSchemaInput = z.input<typeof mechanicFormSchema>;
export type MechanicFormSchemaOutput = z.output<typeof mechanicFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}
