import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";

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

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
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
    where.status = status as Prisma.ClientStatus;
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

  const data: Prisma.ClientCreateInput = {
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

  const client = await prisma.client.create({ data });

  return Response.json(client, { status: 201 });
}
