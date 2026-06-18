import type { NextRequest } from "next/server";
import { Prisma, SupplierOrderStatus } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import {
  supplierOrderFormSchema,
  toDateAtNoon,
  toMoney,
  toNullableString,
} from "@/app/(app)/fornecedores/supplier-order-form-schema";
import { syncSupplierOrderPayable } from "../financial-sync";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getZodErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

const supplierInclude = {
  supplier: {
    select: {
      id: true,
      code: true,
      name: true,
      productLine: true,
    },
  },
} satisfies Prisma.SupplierOrderInclude;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const order = await prisma.supplierOrder.findFirst({
    where: { id, tenantId: tenant.tenantId },
    include: supplierInclude,
  });

  if (!order) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return Response.json(order);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = supplierOrderFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.supplierOrder.findFirst({
        where: { id, tenantId: tenant.tenantId },
        select: { id: true },
      });

      if (!existingOrder) {
        throw new Error("Pedido não encontrado.");
      }

      const supplier = await tx.supplier.findFirst({
        where: { id: parsed.data.supplierId, tenantId: tenant.tenantId },
        select: { id: true },
      });

      if (!supplier) {
        throw new Error("Fornecedor não encontrado.");
      }

      await tx.supplierOrder.updateMany({
        where: { id, tenantId: tenant.tenantId },
        data: {
          supplierId: parsed.data.supplierId,
          status: parsed.data.status as SupplierOrderStatus,
          employee: parsed.data.employee,
          forecastAt: toDateAtNoon(parsed.data.forecastAt),
          invoiceNumber: toNullableString(parsed.data.invoiceNumber),
          total: toMoney(parsed.data.total),
          observation: toNullableString(parsed.data.observation),
          internalDescription: toNullableString(parsed.data.internalDescription),
        },
      });

      const updatedOrder = await tx.supplierOrder.findFirstOrThrow({
        where: { id, tenantId: tenant.tenantId },
        include: supplierInclude,
      });

      await syncSupplierOrderPayable(tx, id, tenant.tenantId);

      return updatedOrder;
    });

    return Response.json(order);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "Pedido ou fornecedor não encontrado." },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "Pedido não encontrado.") {
      return Response.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Fornecedor não encontrado.") {
      return Response.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;

  const order = await prisma.supplierOrder.findFirst({
    where: { id, tenantId: tenant.tenantId },
    select: { id: true },
  });

  if (!order) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  await prisma.supplierOrder.deleteMany({
    where: { id, tenantId: tenant.tenantId },
  });
  return Response.json({ ok: true });
}
