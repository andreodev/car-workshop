import { requireTenantMembership } from '@/app/lib/tenant-context';
import type { NextRequest } from "next/server";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { tenantErrorResponse } from "@/app/api/_utils/tenant-error";
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
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const result = await saleService.list(request, tenant.tenantId);

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

  async create(request: NextRequest) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await saleService.create(payload, defaultResponsible(session), tenant.tenantId);

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

  async findServiceOrderForPdv(request: NextRequest, { params }: RouteContext) {
    try {
      const session = await getServerAuthSession();

      if (!session?.user) {
        return Response.json({ error: "Não autorizado." }, { status: 401 });
      }

      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const result = await saleService.findServiceOrderForPdv(id, tenant.tenantId);

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

  async finalizePayment(request: NextRequest, { params }: RouteContext) {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return Response.json({ error: "Não autorizado." }, { status: 401 });
    }

    try {
      const tenant = await requireTenantMembership(request);
      const { id } = await params;
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await saleService.finalizePayment(id, payload, tenant.tenantId);

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
      const result = await saleService.updateStatus(id, payload, tenant.tenantId);

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
