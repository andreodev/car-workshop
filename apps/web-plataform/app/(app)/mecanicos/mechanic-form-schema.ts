import { z } from "zod";

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} inválido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no máximo ${max} caracteres.`,
    });

const percentageField = z
  .preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z.string({ error: "Comissão inválida." })
  )
  .transform((value) => value.trim().replace(",", "."))
  .transform((value) => (value === "" ? 0 : Number(value)))
  .refine((value) => Number.isFinite(value), {
    message: "Comissão inválida.",
  })
  .refine((value) => value >= 0 && value <= 100, {
    message: "Comissão deve estar entre 0% e 100%.",
  });

export const pixKeyTypeValues = ["CPF", "CNPJ", "CELULAR", "EMAIL", "ALEATORIA", "OUTRA"] as const;

const pixKeyTypeField = z
  .enum(pixKeyTypeValues, { error: "Tipo da chave PIX inválido." })
  .or(z.literal(""));

export const mechanicFormSchema = z.object({
  name: textField("Nome", 120).refine((value) => value.length > 0, {
    message: "Nome é obrigatório.",
  }),
  active: z.boolean({ error: "Situação inválida." }),
  commissionPercent: percentageField,
  paymentKey: textField("Chave PIX", 180),
  paymentKeyHolder: textField("Nome da chave PIX", 120),
  paymentBank: textField("Banco da chave PIX", 120),
  paymentKeyType: pixKeyTypeField,
  notes: textField("Observações", 1000),
});

export type MechanicFormSchemaInput = z.input<typeof mechanicFormSchema>;
export type MechanicFormSchemaOutput = z.output<typeof mechanicFormSchema>;

export function toNullableString(value: string) {
  return value === "" ? null : value;
}
