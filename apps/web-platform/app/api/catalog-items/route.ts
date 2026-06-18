import type { NextRequest } from "next/server";
import { Prisma, type CatalogItemType } from "@prisma/client";

import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";
import {
  buildCatalogItemData,
  normalizeMoney,
  normalizeString,
  normalizeType,
} from "./catalog-item-payload";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const catalogItemTypes = ["PRODUTO", "SERVICO"] as const;

type CatalogItemTypeValue = (typeof catalogItemTypes)[number];

function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  const type = normalizeString(searchParams.get("type"));
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where: Prisma.CatalogItemWhereInput = {
    tenantId: tenant.tenantId,
  };

  if (!includeInactive) {
    where.active = true;
  }

  if (type && catalogItemTypes.includes(type as CatalogItemTypeValue)) {
    where.type = type as CatalogItemType;
  }

  if (search) {
    const code = Number(search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
      { originalCode: { contains: search, mode: "insensitive" } },
      { manufacturerCode: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(code) && code > 0 ? [{ code }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.catalogItem.count({ where }),
    prisma.catalogItem.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
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

  const payload = (await request.json()) as Record<string, unknown>;

  const name = normalizeString(payload.name);
  const type = normalizeType(payload.type);

  if (!name) {
    return Response.json(
      { error: "Nome é obrigatório." },
      { status: 400 }
    );
  }

  if (!type) {
    return Response.json(
      { error: "Tipo inválido." },
      { status: 400 }
    );
  }

  const purchasePrice = normalizeMoney(payload.purchasePrice);
  const profitPercent = normalizeMoney(payload.profitPercent);

  let salePrice: number | null = null;
  let unitPrice: number | null = null;

  if (
    purchasePrice !== null &&
    profitPercent !== null
  ) {
    salePrice =
      purchasePrice +
      (purchasePrice * profitPercent) / 100;

    unitPrice = salePrice;
  } else {
    unitPrice = normalizeMoney(payload.unitPrice);
  }

  if (unitPrice === null) {
    return Response.json(
      {
        error:
          "Valor unitário inválido.",
      },
      { status: 400 }
    );
  }

  const data = buildCatalogItemData({
      ...payload,
      type,
      name,
      purchasePrice,
      profitPercent,
      salePrice,
      unitPrice,
  });

  if (data.sectorId) {
    const sector = await prisma.sector.findFirst({
      where: {
        active: true,
        id: data.sectorId,
        tenantId: tenant.tenantId,
      },
      select: { id: true },
    });

    if (!sector) {
      return Response.json(
        { error: "Setor não encontrado." },
        { status: 400 }
      );
    }
  }

  const item = await prisma.catalogItem.create({
    data: {
      ...data,
      tenantId: tenant.tenantId,
    },
  });

  return Response.json(item, { status: 201 });
}
