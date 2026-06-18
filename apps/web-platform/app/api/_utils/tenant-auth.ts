import type { NextRequest } from "next/server";

import {
  requireTenantMembership,
  TenantAccessError,
  type TenantMembershipContext,
} from "@/app/lib/tenant-context";

function tenantAccessMessage(status: number) {
  if (status === 401) {
    return "Não autorizado.";
  }

  if (status === 404) {
    return "Empresa não encontrada.";
  }

  return "Acesso negado para esta empresa.";
}

export async function requireTenantOrJson(
  request?: NextRequest
): Promise<
  | { tenant: TenantMembershipContext; response: null }
  | { tenant: null; response: Response }
> {
  try {
    return {
      tenant: await requireTenantMembership(request),
      response: null,
    };
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return {
        tenant: null,
        response: Response.json(
          { error: tenantAccessMessage(error.status) },
          { status: error.status }
        ),
      };
    }

    throw error;
  }
}
