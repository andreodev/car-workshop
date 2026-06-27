import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import { buildTenantUrl } from "@/app/lib/tenant-url";
import { classifyTenantHost, hostFromHeaders } from "@/app/lib/tenant-host";
import { Button } from "@/components/ui/button";

export default async function SelecionarOficinaPage() {
  const session = await getServerAuthSession();
  const headerStore = await headers();
  const tenantHostSignal = classifyTenantHost(hostFromHeaders(headerStore));
  const isTenantHost =
    tenantHostSignal.kind === "custom-domain" ||
    tenantHostSignal.kind === "tenant-subdomain";

  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await prisma.tenantUser.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      tenant: {
        status: { notIn: ["SUSPENDED", "CANCELED"] },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          customDomain: true,
          customDomainVerifiedAt: true,
          companySettings: {
            select: {
              tradeName: true,
              legalName: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  if (memberships.length === 1) {
    redirect(isTenantHost ? "/" : buildTenantUrl(memberships[0].tenant));
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-bold">Selecionar oficina</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha em qual tenant voce quer operar.
          </p>
        </header>

        {memberships.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Seu usuario ainda nao possui acesso ativo a nenhuma oficina.
          </div>
        ) : (
          <div className="grid gap-3">
            {memberships.map(({ tenant, role }) => {
              const url = isTenantHost ? "/" : buildTenantUrl(tenant);
              const displayName =
                tenant.companySettings?.tradeName ??
                tenant.companySettings?.legalName ??
                tenant.name;

              return (
                <Link
                  key={tenant.id}
                  href={url}
                  className="grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="flex size-11 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {tenant.companySettings?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tenant.companySettings.logoUrl}
                        alt={displayName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="size-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{displayName}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {tenant.customDomain && tenant.customDomainVerifiedAt
                        ? tenant.customDomain
                        : tenant.slug}
                      {" · "}
                      {role}
                    </span>
                  </span>
                  <Button asChild>
                    <span>
                      Entrar
                      <ArrowRight />
                    </span>
                  </Button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
