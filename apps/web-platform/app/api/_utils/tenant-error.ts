import { TenantAccessError } from "@/app/lib/tenant-context";

export function tenantErrorResponse(error: unknown) {
  if (!(error instanceof TenantAccessError)) {
    return null;
  }

  const messageByStatus = {
    401: "Não autorizado.",
    403: "Acesso negado para esta empresa.",
    404: "Empresa não encontrada.",
  } satisfies Record<TenantAccessError["status"], string>;

  return Response.json(
    { error: messageByStatus[error.status] },
    { status: error.status }
  );
}
