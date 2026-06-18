import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { tenantErrorResponse } from "@/app/api/_utils/tenant-error";
import { requireTenantMembership } from "@/app/lib/tenant-context";
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

      const tenant = await requireTenantMembership(request);
      const result = await estimateService.list(request, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await estimateService.create(
        payload,
        defaultResponsible(session),
        tenant.tenantId
      );

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data, { status: 201 });
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

      throw error;
    }
  },

  async findById(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    try {
      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await estimateService.findById(id, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

      throw error;
    }
  },

  async update(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    try {
      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await estimateService.update(
        id,
        payload,
        defaultResponsible(session),
        tenant.tenantId
      );

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

      throw error;
    }
  },

  async updateStatus(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    try {
      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await estimateService.updateStatus(id, payload, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

      throw error;
    }
  },

  async remove(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    try {
      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await estimateService.remove(id, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

      throw error;
    }
  },

  async convertToServiceOrder(request: NextRequest, { params }: RouteContext) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await estimateService.convertToServiceOrder(id, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data, { status: 201 });
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

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
