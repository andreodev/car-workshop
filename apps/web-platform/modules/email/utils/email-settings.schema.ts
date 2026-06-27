import { z } from "zod";

import type { EmailSettingsFormErrors, EmailSettingsFormValues } from "../types/email-settings.types";

const textField = (label: string, max: number) =>
  z
    .string({ error: `${label} invalido.` })
    .transform((value) => value.trim())
    .refine((value) => value.length <= max, {
      message: `${label} deve ter no maximo ${max} caracteres.`,
    });

const emailField = z
  .string({ error: "E-mail invalido." })
  .transform((value) => value.trim())
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Informe um e-mail valido.",
  });

const emailListField = (label: string, max: number) =>
  textField(label, max).refine(
    (value) =>
      value === "" ||
      value
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .every((email) => z.email().safeParse(email).success),
    { message: `${label} deve conter emails validos separados por virgula ou ponto e virgula.` }
  );

export const emailSettingsSchema = z.object({
  fromName: textField("Nome do remetente", 120),
  fromAddress: emailField.refine((value) => value.length > 0, {
    message: "Email remetente e obrigatorio.",
  }),
  replyTo: emailField,
  notificationsEnabled: z.boolean(),
  notificationEmails: emailListField("Emails de notificacao", 1000),
  emailDomain: textField("Dominio de email", 255),
});

export function toNullableEmailSettingsString(value: string) {
  return value === "" ? null : value;
}

export function getEmailSettingsErrorMap(
  issues: z.core.$ZodIssue[]
): EmailSettingsFormErrors {
  return issues.reduce<EmailSettingsFormErrors>((errors, issue) => {
    const field = issue.path[0] as keyof EmailSettingsFormValues | undefined;

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}
