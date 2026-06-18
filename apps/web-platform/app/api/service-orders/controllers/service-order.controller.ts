import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { requireTenantMembership } from "@/app/lib/tenant-context";
import { tenantErrorResponse } from "@/app/api/_utils/tenant-error";
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

      const tenant = await requireTenantMembership(request);
      const result = await serviceOrderService.list(request, tenant.tenantId);

      if ("error" in result) {
        return errorResponse(result);
      }

      return Response.json(result.data);
    } catch (error) {
      const tenantResponse = tenantErrorResponse(error);

      if (tenantResponse) {
        return tenantResponse;
      }

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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await serviceOrderService.create(
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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await serviceOrderService.findById(id, tenant.tenantId);

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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await serviceOrderService.update(
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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await serviceOrderService.updateStatus(id, payload, tenant.tenantId);

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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await serviceOrderService.remove(id, tenant.tenantId);

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
};
