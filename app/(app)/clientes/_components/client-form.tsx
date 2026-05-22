"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createClient, updateClient } from "../client-api";
import type { Client, ClientFormValues } from "../types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const emptyForm: ClientFormValues = {
  personType: "FISICA",
  status: "ATIVO",
  icms: "ISENTO",
  name: "",
  cpf: "",
  rg: "",
  birthDate: "",
  notesBasic: "",
  email: "",
  phoneResidential: "",
  phoneCommercial: "",
  mobile: "",
  phone1: "",
  phone2: "",
  phone3: "",
  phone4: "",
  website: "",
  social: "",
  otherContact: "",
  notesContacts: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  state: "",
  city: "",
  neighborhood: "",
  ibgeCode: "",
  notesAddress: "",
};

function mapClientToForm(client: Client): ClientFormValues {
  return {
    personType: client.personType,
    status: client.status,
    icms: client.icms,
    name: client.name ?? "",
    cpf: client.cpf ?? "",
    rg: client.rg ?? "",
    birthDate: client.birthDate ? client.birthDate.split("T")[0] : "",
    notesBasic: client.notesBasic ?? "",
    email: client.email ?? "",
    phoneResidential: client.phoneResidential ?? "",
    phoneCommercial: client.phoneCommercial ?? "",
    mobile: client.mobile ?? "",
    phone1: client.phone1 ?? "",
    phone2: client.phone2 ?? "",
    phone3: client.phone3 ?? "",
    phone4: client.phone4 ?? "",
    website: client.website ?? "",
    social: client.social ?? "",
    otherContact: client.otherContact ?? "",
    notesContacts: client.notesContacts ?? "",
    cep: client.cep ?? "",
    address: client.address ?? "",
    number: client.number ?? "",
    complement: client.complement ?? "",
    state: client.state ?? "",
    city: client.city ?? "",
    neighborhood: client.neighborhood ?? "",
    ibgeCode: client.ibgeCode ?? "",
    notesAddress: client.notesAddress ?? "",
  };
}

type ClientFormProps = {
  mode: "create" | "edit";
  initialData?: Client | null;
};

export function ClientForm({ mode, initialData }: ClientFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormValues>(emptyForm);

  useEffect(() => {
    if (initialData) {
      setForm(mapClientToForm(initialData));
    }
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (mode === "edit" && initialData?.id) {
        return updateClient(initialData.id, values);
      }
      return createClient(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      router.push("/clientes");
      router.refresh();
    },
  });

  const isSaving = mutation.isPending;
  const errorMessage = mutation.error ? mutation.error.message : null;

  const onChange = (field: keyof ClientFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const statusOptions = useMemo(
    () => [
      { value: "ATIVO", label: "Ativo" },
      { value: "INATIVO", label: "Inativo" },
    ],
    []
  );

  const personOptions = useMemo(
    () => [
      { value: "FISICA", label: "Fisica" },
      { value: "JURIDICA", label: "Juridica" },
    ],
    []
  );

  const icmsOptions = useMemo(
    () => [
      { value: "ISENTO", label: "Isento" },
      { value: "CONTRIBUINTE", label: "Contribuinte" },
      { value: "NAO_CONTRIBUINTE", label: "Nao contribuinte" },
    ],
    []
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Editar cliente" : "Cadastro de cliente"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Tabs defaultValue="basicos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicos">Dados basicos</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
              <TabsTrigger value="endereco">Endereco</TabsTrigger>
            </TabsList>

            <TabsContent value="basicos" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Pessoa</Label>
                  <Select
                    value={form.personType}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        personType: value as ClientFormValues["personType"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {personOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Situacao</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        status: value as ClientFormValues["status"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>ICMS</Label>
                  <Select
                    value={form.icms}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        icms: value as ClientFormValues["icms"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {icmsOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2 grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={onChange("name")}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={onChange("cpf")}
                    placeholder="CPF"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={form.rg}
                    onChange={onChange("rg")}
                    placeholder="RG"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="birthDate">Data nasc</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={onChange("birthDate")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notesBasic">Observacoes</Label>
                <Textarea
                  id="notesBasic"
                  value={form.notesBasic}
                  onChange={onChange("notesBasic")}
                />
              </div>
            </TabsContent>

            <TabsContent value="contatos" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="phoneResidential">Telefone residencial</Label>
                  <Input
                    id="phoneResidential"
                    value={form.phoneResidential}
                    onChange={onChange("phoneResidential")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneCommercial">Telefone comercial</Label>
                  <Input
                    id="phoneCommercial"
                    value={form.phoneCommercial}
                    onChange={onChange("phoneCommercial")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile">Celular</Label>
                  <Input
                    id="mobile"
                    value={form.mobile}
                    onChange={onChange("mobile")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={onChange("email")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone1">Telefone 1</Label>
                  <Input id="phone1" value={form.phone1} onChange={onChange("phone1")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone2">Telefone 2</Label>
                  <Input id="phone2" value={form.phone2} onChange={onChange("phone2")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone3">Telefone 3</Label>
                  <Input id="phone3" value={form.phone3} onChange={onChange("phone3")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone4">Telefone 4</Label>
                  <Input id="phone4" value={form.phone4} onChange={onChange("phone4")} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="website">Site</Label>
                  <Input id="website" value={form.website} onChange={onChange("website")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="social">Rede social</Label>
                  <Input id="social" value={form.social} onChange={onChange("social")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="otherContact">Outros</Label>
                  <Input
                    id="otherContact"
                    value={form.otherContact}
                    onChange={onChange("otherContact")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notesContacts">Observacoes</Label>
                <Textarea
                  id="notesContacts"
                  value={form.notesContacts}
                  onChange={onChange("notesContacts")}
                />
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={form.cep} onChange={onChange("cep")} />
                </div>
                <div className="md:col-span-2 grid gap-2">
                  <Label htmlFor="address">Endereco</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={onChange("address")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="number">Numero</Label>
                  <Input id="number" value={form.number} onChange={onChange("number")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={form.complement}
                    onChange={onChange("complement")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={form.state} onChange={onChange("state")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={form.city} onChange={onChange("city")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={onChange("neighborhood")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ibgeCode">Cod IBGE Mun</Label>
                  <Input
                    id="ibgeCode"
                    value={form.ibgeCode}
                    onChange={onChange("ibgeCode")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notesAddress">Observacoes</Label>
                <Textarea
                  id="notesAddress"
                  value={form.notesAddress}
                  onChange={onChange("notesAddress")}
                />
              </div>
            </TabsContent>
          </Tabs>

          {errorMessage ? (
            <p className="mt-4 text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/clientes")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
