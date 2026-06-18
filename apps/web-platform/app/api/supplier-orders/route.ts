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
import { syncSupplierOrderPayable } from "./financial-sync";

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

export async function GET(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const page = coerceNumber(searchParams.get("page"), 1);
  const pageSize = Math.min(
    coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const search = normalizeString(searchParams.get("search")) ?? "";
  const status = normalizeString(searchParams.get("status"));

  const where: Prisma.SupplierOrderWhereInput = {
    tenantId: tenant.tenantId,
  };

  if (status && status !== "TODOS") {
    where.status = status as SupplierOrderStatus;
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { employee: { contains: search, mode: "insensitive" } },
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.supplierOrder.count({ where }),
    prisma.supplierOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            productLine: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return Response.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const payload = await request.json();
  const parsed = supplierOrderFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: parsed.data.supplierId, tenantId: tenant.tenantId },
        select: { id: true },
      });

      if (!supplier) {
        throw new Error("Fornecedor não encontrado.");
      }

      const createdOrder = await tx.supplierOrder.create({
        data: {
          tenant: { connect: { id: tenant.tenantId } },
          supplier: { connect: { id: parsed.data.supplierId } },
          status: parsed.data.status as SupplierOrderStatus,
          employee: parsed.data.employee,
          forecastAt: toDateAtNoon(parsed.data.forecastAt),
          invoiceNumber: toNullableString(parsed.data.invoiceNumber),
          total: toMoney(parsed.data.total),
          observation: toNullableString(parsed.data.observation),
          internalDescription: toNullableString(parsed.data.internalDescription),
        },
        include: {
          supplier: {
            select: { id: true, code: true, name: true, productLine: true },
          },
        },
      });

      await syncSupplierOrderPayable(tx, createdOrder.id, tenant.tenantId);

      return createdOrder;
    });

    return Response.json(order, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Fornecedor não encontrado.") {
      return Response.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
