import type { NextRequest } from "next/server";
import { Prisma, SupplierPersonType } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { supplierFormSchema, toNullableString } from "@/app/(app)/fornecedores/supplier-form-schema";

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

function getZodErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function toSupplierData(
  values: ReturnType<typeof supplierFormSchema.parse>
): Prisma.SupplierCreateInput {
  return {
    personType: values.personType as SupplierPersonType,
    name: values.name,
    cpf: toNullableString(values.cpf),
    rg: toNullableString(values.rg),
    contact: toNullableString(values.contact),
    productLine: toNullableString(values.productLine),
    phone1: toNullableString(values.phone1),
    phone2: toNullableString(values.phone2),
    phone3: toNullableString(values.phone3),
    phone4: toNullableString(values.phone4),
    email: toNullableString(values.email),
    website: toNullableString(values.website),
    cep: toNullableString(values.cep),
    city: toNullableString(values.city),
    state: toNullableString(values.state),
    address: toNullableString(values.address),
    neighborhood: toNullableString(values.neighborhood),
    bank: toNullableString(values.bank),
    account: toNullableString(values.account),
    agency: toNullableString(values.agency),
    notes: toNullableString(values.notes),
  };
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

  const where: Prisma.SupplierWhereInput = {};

  if (search) {
    const code = Number(search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contact: { contains: search, mode: "insensitive" } },
      { productLine: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
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

  const payload = await request.json();
  const parsed = supplierFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: toSupplierData(parsed.data),
  });

  return Response.json(supplier, { status: 201 });
}
