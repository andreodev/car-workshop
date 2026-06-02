import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { saleService } from "../services/sale.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function defaultResponsible(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  return session?.user?.name ?? session?.user?.email ?? "Operador";
}

function errorResponse(result: { error: string; status: number; details?: string }) {
  return Response.json(
    {
      error: result.error,
      ...(result.details ? { details: result.details } : {}),
    },
    { status: result.status },
  );
}

export const saleController = {
  async list(request: NextRequest) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await saleService.list(request);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async create(request: NextRequest) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const result = await saleService.create(payload, defaultResponsible(session));

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data, { status: 201 });
  },

  async findServiceOrderForPdv(_request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const result = await saleService.findServiceOrderForPdv(id);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async finalizePayment(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await saleService.finalizePayment(id, payload);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async updateStatus(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await saleService.updateStatus(id, payload);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },
};
