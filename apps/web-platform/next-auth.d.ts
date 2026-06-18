import type { DefaultSession } from "next-auth";
import type { TenantRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      selectedTenantId?: string | null;
    };
    selectedTenantId?: string | null;
    tenantRole?: TenantRole | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    selectedTenantId?: string | null;
    tenantRole?: TenantRole | null;
  }
}
