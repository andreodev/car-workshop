import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBirthDate(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Data de nascimento invalida." };
  }

  return { value: parsed };
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    return Response.json({ error: "Cliente nao encontrado." }, { status: 404 });
  }

  return Response.json(client);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const name = normalizeString(payload.name);

  if (!name) {
    return Response.json({ error: "Nome e obrigatorio." }, { status: 400 });
  }

  const birthDate = parseBirthDate(payload.birthDate);
  if (birthDate?.error) {
    return Response.json({ error: birthDate.error }, { status: 400 });
  }

  const data: Prisma.ClientUpdateInput = {
    personType: (normalizeString(payload.personType) ?? "FISICA") as Prisma.ClientPersonType,
    status: (normalizeString(payload.status) ?? "ATIVO") as Prisma.ClientStatus,
    icms: (normalizeString(payload.icms) ?? "ISENTO") as Prisma.ClientIcms,
    name,
    cpf: normalizeString(payload.cpf),
    rg: normalizeString(payload.rg),
    birthDate: birthDate?.value ?? null,
    notesBasic: normalizeString(payload.notesBasic),
    email: normalizeString(payload.email),
    phoneResidential: normalizeString(payload.phoneResidential),
    phoneCommercial: normalizeString(payload.phoneCommercial),
    mobile: normalizeString(payload.mobile),
    phone1: normalizeString(payload.phone1),
    phone2: normalizeString(payload.phone2),
    phone3: normalizeString(payload.phone3),
    phone4: normalizeString(payload.phone4),
    website: normalizeString(payload.website),
    social: normalizeString(payload.social),
    otherContact: normalizeString(payload.otherContact),
    notesContacts: normalizeString(payload.notesContacts),
    cep: normalizeString(payload.cep),
    address: normalizeString(payload.address),
    number: normalizeString(payload.number),
    complement: normalizeString(payload.complement),
    state: normalizeString(payload.state),
    city: normalizeString(payload.city),
    neighborhood: normalizeString(payload.neighborhood),
    ibgeCode: normalizeString(payload.ibgeCode),
    notesAddress: normalizeString(payload.notesAddress),
  };

  const client = await prisma.client.update({
    where: { id },
    data,
  });

  return Response.json(client);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  await prisma.client.delete({ where: { id } });

  return Response.json({ ok: true });
}
