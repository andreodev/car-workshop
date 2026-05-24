import type { NextRequest } from "next/server";
import { Prisma, SupplierOrderStatus } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import {
  supplierOrderFormSchema,
  toDateAtNoon,
  toNullableString,
} from "@/app/(app)/fornecedores/supplier-order-form-schema";

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

  const where: Prisma.SupplierOrderWhereInput = {};

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
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = supplierOrderFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const order = await prisma.supplierOrder.create({
      data: {
        supplier: { connect: { id: parsed.data.supplierId } },
        status: parsed.data.status as SupplierOrderStatus,
        employee: parsed.data.employee,
        forecastAt: toDateAtNoon(parsed.data.forecastAt),
        invoiceNumber: toNullableString(parsed.data.invoiceNumber),
        observation: toNullableString(parsed.data.observation),
        internalDescription: toNullableString(parsed.data.internalDescription),
      },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, productLine: true },
        },
      },
    });

    return Response.json(order, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }

    throw error;
  }
}
