import type { NextRequest } from "next/server";
import type { ClientIcms, ClientPersonType, ClientStatus, Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { clientFormSchema, toNullableString } from "@/app/(app)/clientes/client-form-schema";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = coerceNumber(searchParams.get("page"), 1);
  const pageSize = Math.min(
    coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const search = normalizeString(searchParams.get("search")) ?? "";
  const status = normalizeString(searchParams.get("status"));

  const where: Prisma.ClientWhereInput = {};

  if (status && status !== "TODOS") {
    where.status = status as ClientStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { phoneResidential: { contains: search, mode: "insensitive" } },
      { phoneCommercial: { contains: search, mode: "insensitive" } },
      { phone1: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return Response.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

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

  const data: Prisma.ClientCreateInput = {
    personType: parsed.data.personType as ClientPersonType,
    status: parsed.data.status as ClientStatus,
    icms: parsed.data.icms as ClientIcms,
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

  const client = await prisma.client.create({ data });

  return Response.json(client, { status: 201 });
}
