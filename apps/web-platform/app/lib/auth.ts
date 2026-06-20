import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/app/lib/prisma";
import {
  TENANT_HOST_HEADER,
  TENANT_HOST_KIND_HEADER,
  TENANT_SLUG_HEADER,
} from "@/app/lib/tenant-headers";
import {
  classifyTenantHost,
  normalizeHost,
  type TenantHostKind,
} from "@/app/lib/tenant-host";

type AuthRequest = {
  headers?: Headers | Record<string, string | string[] | undefined>;
};

function authRequestHeader(request: AuthRequest | undefined, name: string) {
  const headers = request?.headers;

  if (!headers) {
    return null;
  }

  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name);
  }

  const headerMap = headers as Record<string, string | string[] | undefined>;
  const value = headerMap[name] ?? headerMap[name.toLowerCase()];

  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function authRequestHost(request: AuthRequest | undefined) {
  return normalizeHost(
    authRequestHeader(request, TENANT_HOST_HEADER) ??
      authRequestHeader(request, "x-forwarded-host") ??
      authRequestHeader(request, "x-vercel-forwarded-host") ??
      authRequestHeader(request, "host")
  );
}

async function resolveLoginTenant(request: AuthRequest | undefined) {
  const host = authRequestHost(request);
  const classified = classifyTenantHost(host);
  const signal = {
    host,
    kind:
      (authRequestHeader(request, TENANT_HOST_KIND_HEADER) as
        | TenantHostKind
        | null) ?? classified.kind,
    slug: authRequestHeader(request, TENANT_SLUG_HEADER) ?? classified.slug,
  };

  if (signal.kind === "platform-root") {
    return { requiresTenantMembership: false, tenant: null };
  }

  if (signal.kind === "tenant-subdomain" && signal.slug) {
    return {
      requiresTenantMembership: true,
      tenant: await prisma.tenant.findUnique({
        where: { slug: signal.slug },
        select: { id: true, status: true },
      }),
    };
  }

  if (signal.kind === "custom-domain" && signal.host) {
    return {
      requiresTenantMembership: true,
      tenant: await prisma.tenant.findFirst({
        where: {
          customDomain: signal.host,
          customDomainVerifiedAt: { not: null },
        },
        select: { id: true, status: true },
      }),
    };
  }

  return { requiresTenantMembership: false, tenant: null };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.selectedTenantId = user.selectedTenantId ?? null;
        token.tenantRole = user.tenantRole ?? null;
        token.tenantMembershipCount = user.tenantMembershipCount ?? 0;
      }

      if (token.userId && !token.selectedTenantId) {
        const memberships = await prisma.tenantUser.findMany({
          where: {
            userId: token.userId,
            isActive: true,
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            tenantId: true,
            role: true,
          },
          take: 2,
        });
        const membership = memberships[0] ?? null;

        token.selectedTenantId = membership?.tenantId ?? null;
        token.tenantRole = membership?.role ?? null;
        token.tenantMembershipCount = memberships.length;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }

      session.selectedTenantId = token.selectedTenantId ?? null;
      session.tenantRole = token.tenantRole ?? null;
      session.tenantMembershipCount = token.tenantMembershipCount ?? 0;

      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        const loginTenant = await resolveLoginTenant(request);

        if (loginTenant.requiresTenantMembership) {
          if (!loginTenant.tenant) {
            return null;
          }

          if (
            loginTenant.tenant.status === "SUSPENDED" ||
            loginTenant.tenant.status === "CANCELED"
          ) {
            return null;
          }

          const membership = await prisma.tenantUser.findUnique({
            where: {
              tenantId_userId: {
                tenantId: loginTenant.tenant.id,
                userId: user.id,
              },
            },
            select: {
              role: true,
              isActive: true,
            },
          });

          if (!membership?.isActive) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            selectedTenantId: loginTenant.tenant.id,
            tenantRole: membership.role,
            tenantMembershipCount: 1,
          };
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
};
