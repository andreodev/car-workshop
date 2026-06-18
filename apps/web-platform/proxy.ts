import { NextResponse, type NextRequest } from "next/server";

import {
  RESOLVED_TENANT_ID_HEADER,
  TENANT_HOST_HEADER,
  TENANT_HOST_KIND_HEADER,
  TENANT_SLUG_HEADER,
} from "@/app/lib/tenant-headers";
import { classifyTenantHost, hostFromHeaders } from "@/app/lib/tenant-host";

export function proxy(request: NextRequest) {
  const host = hostFromHeaders(request.headers);
  const tenantSignal = classifyTenantHost(host);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete(RESOLVED_TENANT_ID_HEADER);
  if (tenantSignal.host) {
    requestHeaders.set(TENANT_HOST_HEADER, tenantSignal.host);
  } else {
    requestHeaders.delete(TENANT_HOST_HEADER);
  }
  requestHeaders.set(TENANT_HOST_KIND_HEADER, tenantSignal.kind);
  requestHeaders.delete(TENANT_SLUG_HEADER);

  if (tenantSignal.slug) {
    requestHeaders.set(TENANT_SLUG_HEADER, tenantSignal.slug);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
