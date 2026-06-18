import type { NextRequest } from "next/server";
import { Prisma, SupplierPersonType } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import { supplierFormSchema, toNullableString } from "@/app/(app)/fornecedores/supplier-form-schema";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getZodErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function toSupplierData(
  values: ReturnType<typeof supplierFormSchema.parse>
): Prisma.SupplierUpdateInput {
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: tenant.tenantId },
  });

  if (!supplier) {
    return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  }

  return Response.json(supplier);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = supplierFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  const existingSupplier = await prisma.supplier.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!existingSupplier) {
    return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  }

  await prisma.supplier.updateMany({
    where: { id, tenantId: tenant.tenantId },
    data: toSupplierData(parsed.data),
  });

  const supplier = await prisma.supplier.findFirstOrThrow({
    where: { id, tenantId: tenant.tenantId },
  });

  return Response.json(supplier);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!supplier) {
    return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  }

  try {
    await prisma.supplier.deleteMany({
      where: { id, tenantId: tenant.tenantId },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return Response.json(
        { error: "Este fornecedor possui pedidos e não pode ser excluído." },
        { status: 409 }
      );
    }

    throw error;
  }
}
