import type { NextRequest } from "next/server";
import { Prisma, SupplierOrderStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.supplierOrder.findUnique({
    where: { id },
    include: supplierInclude,
  });

  if (!order) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return Response.json(order);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = supplierOrderFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.supplierOrder.update({
        where: { id },
        data: {
          supplier: { connect: { id: parsed.data.supplierId } },
          status: parsed.data.status as SupplierOrderStatus,
          employee: parsed.data.employee,
          forecastAt: toDateAtNoon(parsed.data.forecastAt),
          invoiceNumber: toNullableString(parsed.data.invoiceNumber),
          total: toMoney(parsed.data.total),
          observation: toNullableString(parsed.data.observation),
          internalDescription: toNullableString(parsed.data.internalDescription),
        },
        include: supplierInclude,
      });

      await syncSupplierOrderPayable(tx, id);

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

    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.supplierOrder.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    throw error;
  }
}
