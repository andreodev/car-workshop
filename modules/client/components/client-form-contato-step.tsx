"use client";

import type { ClientFormValues } from "../types/client.types";
import { ClientFormSection } from "./client-form-section";
import {
  ClientInputField,
  ClientTextareaField,
  type ClientFormFieldProps,
} from "./client-form-fields";

const mainPhones = [
  ["mobile", "Celular", "(00) 00000-0000"],
  ["phoneResidential", "Telefone residencial", "(00) 0000-0000"],
  ["phoneCommercial", "Telefone comercial", "(00) 0000-0000"],
] as const satisfies Array<readonly [keyof ClientFormValues, string, string]>;

const extraPhones = ["phone1", "phone2", "phone3", "phone4"] as const;

export function ClientFormContatoStep(props: ClientFormFieldProps) {
  return (
    <>
      <ClientFormSection
        title="Contato principal"
        description="Informe os canais de contato mais utilizados pela equipe."
      >
        <div className="grid gap-4 lg:grid-cols-12">
          {mainPhones.map(([field, label, placeholder]) => (
            <ClientInputField
              key={field}
              field={field}
              label={label}
              wrapperClassName="grid gap-2 lg:col-span-3"
              inputMode="numeric"
              maxLength={15}
              placeholder={placeholder}
              {...props}
            />
          ))}

          <ClientInputField
            field="email"
            label="E-mail"
            wrapperClassName="grid gap-2 lg:col-span-3"
            type="email"
            placeholder="cliente@exemplo.com"
            {...props}
          />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Canais adicionais"
        description="Use estes campos para telefones secundários e canais digitais."
      >
        <div className="grid gap-4 lg:grid-cols-12">
          {extraPhones.map((field, index) => (
            <ClientInputField
              key={field}
              field={field}
              label={`Telefone ${index + 1}`}
              wrapperClassName="grid gap-2 lg:col-span-3"
              inputMode="numeric"
              maxLength={15}
              placeholder="(00) 00000-0000"
              {...props}
            />
          ))}

          <ClientInputField
            field="website"
            label="Site"
            wrapperClassName="grid gap-2 lg:col-span-4"
            placeholder="https://site.com.br"
            {...props}
          />
          <ClientInputField
            field="social"
            label="Rede social"
            wrapperClassName="grid gap-2 lg:col-span-4"
            placeholder="@perfil"
            {...props}
          />
          <ClientInputField
            field="otherContact"
            label="Outro canal de contato"
            wrapperClassName="grid gap-2 lg:col-span-4"
            {...props}
          />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Observações"
        description="Registre disponibilidade, preferências de horário ou detalhes para retorno."
      >
        <ClientTextareaField
          field="notesContacts"
          label="Anotações de contato"
          {...props}
        />
      </ClientFormSection>
    </>
  );
}
