import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { mechanicFormSchema, toNullableString } from "@/app/(app)/mecanicos/mechanic-form-schema";
import { apiErrorResponse } from "@/app/api/_utils/api-error";
import { requireTenantOrJson } from "@/app/api/_utils/tenant-auth";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getZodErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

const mechanicSelect = {
  id: true,
  code: true,
  name: true,
  active: true,
  commissionPercent: true,
  paymentKey: true,
  paymentKeyHolder: true,
  paymentBank: true,
  paymentKeyType: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MechanicSelect;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  let mechanic;

  try {
    mechanic = await prisma.mechanic.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: mechanicSelect,
    });
  } catch (error) {
    return apiErrorResponse(error, {
      fallback: "Não foi possível carregar o mecânico.",
    });
  }

  if (!mechanic) {
    return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
  }

  return Response.json(mechanic);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido.", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = mechanicFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const existing = await prisma.mechanic.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
    }

    await prisma.mechanic.updateMany({
      where: { id, tenantId: tenant.tenantId },
      data: {
        name: parsed.data.name,
        active: parsed.data.active,
        commissionPercent: parsed.data.commissionPercent,
        paymentKey: toNullableString(parsed.data.paymentKey),
        paymentKeyHolder: toNullableString(parsed.data.paymentKeyHolder),
        paymentBank: toNullableString(parsed.data.paymentBank),
        paymentKeyType: toNullableString(parsed.data.paymentKeyType),
        notes: toNullableString(parsed.data.notes),
      },
    });

    const mechanic = await prisma.mechanic.findFirstOrThrow({
      where: { id, tenantId: tenant.tenantId },
      select: mechanicSelect,
    });

    return Response.json(mechanic);
  } catch (error) {
    return apiErrorResponse(error, {
      fallback: "Não foi possível atualizar o mecânico.",
      notFoundMessage: "Mecânico não encontrado.",
      uniqueMessage: "Já existe um mecânico com este nome.",
    });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { tenant, response } = await requireTenantOrJson(request);

  if (response) {
    return response;
  }

  const { id } = await params;

  try {
    const existing = await prisma.mechanic.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
    }

    await prisma.mechanic.deleteMany({
      where: { id, tenantId: tenant.tenantId },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, {
      fallback: "Não foi possível excluir o mecânico.",
      notFoundMessage: "Mecânico não encontrado.",
    });
  }
}
