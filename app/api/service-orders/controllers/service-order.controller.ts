import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { serviceOrderService } from "../services/service-order.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function defaultResponsible(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  return session?.user?.name ?? session?.user?.email;
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

export const serviceOrderController = {
  async list(request: NextRequest) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const result = await serviceOrderService.list(request);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      console.error("Erro ao listar ordens de serviço", error);

      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Erro ao carregar ordens de serviço.",
        },
        { status: 500 },
      );
    }
  },

  async create(request: NextRequest) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const result = await serviceOrderService.create(payload, defaultResponsible(session));

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data, { status: 201 });
  },

  async findById(_request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const result = await serviceOrderService.findById(id);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async update(request: NextRequest, { params }: RouteContext) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await serviceOrderService.update(id, payload, defaultResponsible(session));

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      console.error("[SERVICE_ORDER_UPDATE] TRANSACTION ERROR:", error);

      return Response.json(
        {
          error: "Erro ao atualizar ordem de serviço.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  },

  async updateStatus(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await serviceOrderService.updateStatus(id, payload);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async remove(_request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const result = await serviceOrderService.remove(id);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },
};
