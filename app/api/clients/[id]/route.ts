import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { clientFormSchema, toNullableString } from "@/app/(app)/clientes/client-form-schema";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return Response.json(client);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();
  const { id } = await params;

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = clientFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const data: Prisma.ClientUpdateInput = {
    personType: parsed.data.personType as Prisma.ClientPersonType,
    status: parsed.data.status as Prisma.ClientStatus,
    icms: parsed.data.icms as Prisma.ClientIcms,
    name: parsed.data.name,
    cpf: toNullableString(parsed.data.cpf),
    rg: toNullableString(parsed.data.rg),
    birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
    notesBasic: toNullableString(parsed.data.notesBasic),
    email: toNullableString(parsed.data.email),
    phoneResidential: toNullableString(parsed.data.phoneResidential),
    phoneCommercial: toNullableString(parsed.data.phoneCommercial),
    mobile: toNullableString(parsed.data.mobile),
    phone1: toNullableString(parsed.data.phone1),
    phone2: toNullableString(parsed.data.phone2),
    phone3: toNullableString(parsed.data.phone3),
    phone4: toNullableString(parsed.data.phone4),
    website: toNullableString(parsed.data.website),
    social: toNullableString(parsed.data.social),
    otherContact: toNullableString(parsed.data.otherContact),
    notesContacts: toNullableString(parsed.data.notesContacts),
    cep: toNullableString(parsed.data.cep),
    address: toNullableString(parsed.data.address),
    number: toNullableString(parsed.data.number),
    complement: toNullableString(parsed.data.complement),
    state: toNullableString(parsed.data.state),
    city: toNullableString(parsed.data.city),
    neighborhood: toNullableString(parsed.data.neighborhood),
    ibgeCode: toNullableString(parsed.data.ibgeCode),
    notesAddress: toNullableString(parsed.data.notesAddress),
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
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  await prisma.client.delete({ where: { id } });

  return Response.json({ ok: true });
}
