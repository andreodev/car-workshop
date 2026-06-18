"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/ui/header";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { clientsKeys } from "../../api/client.keys";
import { clientsService } from "../../api/client.service";
import type { Client } from "../../types/client.types";
import {
  formatCep,
  formatCpfCnpj,
  formatPhone,
  formatRg,
} from "../../utils/client-form-utils";
import { onlyDigits } from "../../utils/client-input-masks";

type ClientDetailsPageProps = {
  id: string;
};

type DetailItemProps = {
  label: string;
  value?: string | null;
  href?: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: Client["status"]) {
  return status === "ATIVO" ? "Ativo" : "Inativo";
}

function formatPersonType(personType: Client["personType"]) {
  return personType === "FISICA" ? "Pessoa física" : "Pessoa jurídica";
}

function formatIcms(icms: Client["icms"]) {
  const labels: Record<Client["icms"], string> = {
    CONTRIBUINTE: "Contribuinte",
    ISENTO: "Isento",
    NAO_CONTRIBUINTE: "Nao contribuinte",
  };

  return labels[icms];
}

function formatAddress(client: Client) {
  const street = [client.address, client.number].filter(Boolean).join(", ");
  const districtCity = [client.neighborhood, client.city, client.state]
    .filter(Boolean)
    .join(" - ");
  const rows = [street, client.complement, districtCity].filter(Boolean);

  return rows.length > 0 ? rows.join("\n") : null;
}

function formatExternalUrl(value?: string | null) {
  if (!value?.trim()) {
    return undefined;
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function DetailItem({ label, value, href }: DetailItemProps) {
  const displayValue = value?.trim() ? value : "-";

  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-h-5 whitespace-pre-line text-sm text-foreground">
        {href && value?.trim() ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            className="text-primary underline-offset-4 hover:underline"
          >
            {displayValue}
          </a>
        ) : (
          displayValue
        )}
      </dd>
    </div>
  );
}

function DetailsCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-1.5 text-primary">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

export default function ClientDetailsPage({ id }: ClientDetailsPageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: () => clientsService.findById(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner size="sm" className="text-primary" />
        Carregando cliente...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <Alert variant="destructive" className="mx-auto max-w-lg">
          <AlertTitle>Erro ao carregar cliente</AlertTitle>
          <AlertDescription>Nao foi possivel carregar o cliente.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const mobileHref = data.mobile ? `https://wa.me/${onlyDigits(data.mobile)}` : undefined;

  return (
    <section className="flex min-h-[calc(100vh-3rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-3">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-2">
            <Link href="/clientes">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
          <Header
            title={data.name}
            description="Detalhes cadastrais, contato e Endereço do cliente."
          />
        </div>

        <Button asChild className="h-9 shrink-0 gap-2 font-medium">
          <Link href={`/clientes/${data.id}/editar`}>
            <Edit3 className="size-4" />
            Editar cliente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            Resumo
          </CardTitle>
          <CardAction>
            {data.status === "ATIVO" ? (
              <Badge
                variant="default"
                className="gap-1.5 border-0 bg-primary/15 text-primary"
              >
                <span className="status-dot-active" />
                {formatStatus(data.status)}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
                <span className="status-dot-inactive" />
                {formatStatus(data.status)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Tipo" value={formatPersonType(data.personType)} />
            <DetailItem
              label={data.personType === "JURIDICA" ? "CNPJ" : "CPF"}
              value={data.cpf ? formatCpfCnpj(data.cpf) : null}
            />
            <DetailItem label="RG" value={data.rg ? formatRg(data.rg) : null} />
            <DetailItem label="Nascimento" value={formatDate(data.birthDate)} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailsCard title="Contato" icon={<Phone className="size-4" />}>
          <DetailItem
            label="Celular"
            value={data.mobile ? formatPhone(data.mobile) : null}
            href={mobileHref}
          />
          <DetailItem
            label="Telefone residencial"
            value={data.phoneResidential ? formatPhone(data.phoneResidential) : null}
          />
          <DetailItem
            label="Telefone comercial"
            value={data.phoneCommercial ? formatPhone(data.phoneCommercial) : null}
          />
          <DetailItem label="E-mail" value={data.email} href={data.email ? `mailto:${data.email}` : undefined} />
          <DetailItem label="Site" value={data.website} href={formatExternalUrl(data.website)} />
          <DetailItem label="Rede social" value={data.social} />
        </DetailsCard>

        <DetailsCard title="Endereço" icon={<MapPin className="size-4" />}>
          <DetailItem label="CEP" value={data.cep ? formatCep(data.cep) : null} />
          <DetailItem label="Endereço" value={formatAddress(data)} />
          <DetailItem label="Cidade" value={data.city} />
          <DetailItem label="Estado" value={data.state} />
          <DetailItem label="Bairro" value={data.neighborhood} />
          <DetailItem label="Codigo IBGE" value={data.ibgeCode} />
        </DetailsCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailsCard title="Fiscal" icon={<Building2 className="size-4" />}>
          <DetailItem label="ICMS" value={formatIcms(data.icms)} />
          <DetailItem label="Tipo de pessoa" value={formatPersonType(data.personType)} />
        </DetailsCard>

        <DetailsCard title="Outros dados" icon={<Globe className="size-4" />}>
          <DetailItem label="Telefone 1" value={data.phone1 ? formatPhone(data.phone1) : null} />
          <DetailItem label="Telefone 2" value={data.phone2 ? formatPhone(data.phone2) : null} />
          <DetailItem label="Telefone 3" value={data.phone3 ? formatPhone(data.phone3) : null} />
          <DetailItem label="Telefone 4" value={data.phone4 ? formatPhone(data.phone4) : null} />
          <DetailItem label="Outro contato" value={data.otherContact} />
          <DetailItem label="Atualizado em" value={formatDate(data.updatedAt)} />
        </DetailsCard>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DetailItem label="Dados basicos" value={data.notesBasic} />
          <Separator />
          <DetailItem label="Contatos" value={data.notesContacts} />
          <Separator />
          <DetailItem label="Endereço" value={data.notesAddress} />
          <Separator />
          <DetailItem label="Criado em" value={formatDate(data.createdAt)} />
        </CardContent>
      </Card>
    </section>
  );
}
