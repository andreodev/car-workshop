import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { estimateService } from "../services/estimate.service";

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

export const estimateController = {
  async list(request: NextRequest) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const result = await estimateService.list(request);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      console.error("Erro ao listar orçamentos", error);

      return Response.json(
        {
          error: error instanceof Error ? error.message : "Erro ao carregar orçamentos.",
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
    const result = await estimateService.create(payload, defaultResponsible(session));

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
    const result = await estimateService.findById(id);

    if ("error" in result) {
      return errorResponse(result);
    }

    return Response.json(result.data);
  },

  async update(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await estimateService.update(id, payload, defaultResponsible(session));

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
    const result = await estimateService.updateStatus(id, payload);

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
    const result = await estimateService.remove(id);

    return Response.json(result.data);
  },

  async convertToServiceOrder(_request: NextRequest, { params }: RouteContext) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const { id } = await params;
      const result = await estimateService.convertToServiceOrder(id);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data, { status: 201 });
    } catch (error) {
      console.error("[ESTIMATE_TO_OS] Erro ao converter orçamento para OS:", error);

      return Response.json(
        {
          error: "Erro ao converter orçamento para ordem de serviço.",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        { status: 500 },
      );
    }
  },
};
