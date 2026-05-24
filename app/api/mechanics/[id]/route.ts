import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { mechanicFormSchema, toNullableString } from "@/app/(app)/mecanicos/mechanic-form-schema";
import { getServerAuthSession } from "@/app/lib/auth-server";
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const mechanic = await prisma.mechanic.findUnique({ where: { id } });

  if (!mechanic) {
    return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
  }

  return Response.json(mechanic);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = mechanicFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const mechanic = await prisma.mechanic.update({
      where: { id },
      data: {
        name: parsed.data.name,
        active: parsed.data.active,
        notes: toNullableString(parsed.data.notes),
      },
    });

    return Response.json(mechanic);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Ja existe um mecânico com este nome." },
        { status: 409 }
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
    await prisma.mechanic.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Mecânico não encontrado." }, { status: 404 });
    }

    throw error;
  }
}
