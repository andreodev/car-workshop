"use client";

import { ClientFormSection } from "./client-form-section";
import { icmsOptions, personOptions, statusOptions } from "./client-form-constants";
import {
  ClientInputField,
  ClientSelectField,
  ClientTextareaField,
  type ClientFormFieldProps,
} from "./client-form-fields";

export function ClientFormDadosStep(props: ClientFormFieldProps) {
  const isCompany = props.form.personType === "JURIDICA";

  return (
    <>
      <ClientFormSection
        title="Classificação"
        description="Defina o tipo de pessoa e os parâmetros principais do cadastro."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ClientSelectField field="personType" label="Pessoa" options={personOptions} {...props} />
          <ClientSelectField field="status" label="Situação" options={statusOptions} {...props} />
          <ClientSelectField field="icms" label="ICMS" options={icmsOptions} {...props} />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Identificação"
        description="Distribuímos os campos principais em uma grade mais ampla para aproveitar melhor a tela."
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <ClientInputField
            field="name"
            label="Nome"
            wrapperClassName="grid gap-2 lg:col-span-6"
            placeholder="Nome completo"
            required
            {...props}
          />
          <ClientInputField
            field="cpf"
            label={isCompany ? "CNPJ" : "CPF"}
            wrapperClassName="grid gap-2 lg:col-span-3"
            placeholder={isCompany ? "00.000.000/0000-00" : "000.000.000-00"}
            inputMode="numeric"
            maxLength={isCompany ? 18 : 14}
            {...props}
          />
          <ClientInputField
            field="rg"
            label="RG"
            wrapperClassName="grid gap-2 lg:col-span-3"
            placeholder="RG"
            inputMode="numeric"
            maxLength={14}
            {...props}
          />
          <ClientInputField
            field="birthDate"
            label="Data de nascimento"
            wrapperClassName="grid gap-2 lg:col-span-4"
            type="date"
            {...props}
          />
        </div>
      </ClientFormSection>

      <ClientFormSection
        title="Observações"
        description="Use este espaço para particularidades relevantes no atendimento."
      >
        <ClientTextareaField
          field="notesBasic"
          label="Anotações internas"
          placeholder="Ex.: preferência de contato, restrições ou observações importantes."
          {...props}
        />
      </ClientFormSection>
    </>
  );
}
