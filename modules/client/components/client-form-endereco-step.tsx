"use client";

import { ClientFormSection } from "./client-form-section";
import {
  ClientInputField,
  ClientTextareaField,
  type ClientFormFieldProps,
} from "./client-form-fields";

type ClientFormEnderecoStepProps = ClientFormFieldProps & {
  cepError?: string | null;
  isCepLoading?: boolean;
};

export function ClientFormEnderecoStep({
  cepError,
  isCepLoading = false,
  ...props
}: ClientFormEnderecoStepProps) {
  return (
    <>
      <ClientFormSection
        title="Endereço principal"
        description="A distribuição abaixo reduz espaços mortos e melhora a leitura dos campos longos."
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <ClientInputField
            field="cep"
            label="CEP"
            wrapperClassName="grid gap-2 lg:col-span-2"
            inputMode="numeric"
            maxLength={9}
            placeholder="00000-000"
            helperText={
              isCepLoading ? "Buscando endereço..." : cepError ?? undefined
            }
            helperTone={cepError ? "error" : "muted"}
            {...props}
          />
          <ClientInputField
            field="address"
            label="Endereço"
            wrapperClassName="grid gap-2 lg:col-span-6"
            {...props}
          />
          <ClientInputField
            field="number"
            label="Número"
            wrapperClassName="grid gap-2 lg:col-span-2"
            {...props}
          />
          <ClientInputField
            field="complement"
            label="Complemento"
            wrapperClassName="grid gap-2 lg:col-span-2"
            {...props}
          />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Região e referência fiscal"
        description="Mantenha cidade, bairro e código IBGE agrupados para consulta rápida."
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <ClientInputField
            field="state"
            label="Estado"
            wrapperClassName="grid gap-2 lg:col-span-2"
            maxLength={2}
            placeholder="AM"
            {...props}
          />
          <ClientInputField
            field="city"
            label="Cidade"
            wrapperClassName="grid gap-2 lg:col-span-4"
            {...props}
          />
          <ClientInputField
            field="neighborhood"
            label="Bairro"
            wrapperClassName="grid gap-2 lg:col-span-3"
            {...props}
          />
          <ClientInputField
            field="ibgeCode"
            label="Código IBGE"
            wrapperClassName="grid gap-2 lg:col-span-3"
            inputMode="numeric"
            maxLength={7}
            {...props}
          />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Observações"
        description="Reserve este espaço para referências de acesso, entrega ou particularidades da localização."
      >
        <ClientTextareaField
          field="notesAddress"
          label="Anotações de endereço"
          {...props}
        />
      </ClientFormSection>
    </>
  );
}
