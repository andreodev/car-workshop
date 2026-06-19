import { notFound, redirect } from "next/navigation";
import { Ban } from "lucide-react";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { requireTenantMembership, TenantAccessError } from "@/app/lib/tenant-context";
import { PdvLauncher } from "@/modules/pdv";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { getCurrentTenantBranding } from "@/app/lib/tenant-branding";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  try {
    await requireTenantMembership();
  } catch (error) {
    if (error instanceof TenantAccessError) {
      if (error.status === 401) {
        redirect("/login");
      }

      if (error.message === "Tenant suspended" || error.message === "Tenant canceled") {
        return (
          <main className="flex min-h-screen items-center justify-center bg-background px-4">
            <section className="grid max-w-md gap-3 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
              <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Ban className="size-6" />
              </span>
              <h1 className="font-heading text-xl font-semibold">Oficina bloqueada</h1>
              <p className="text-sm text-muted-foreground">
                O acesso a esta oficina foi interrompido. Entre em contato com o suporte para
                regularizar o acesso.
              </p>
            </section>
          </main>
        );
      }

      notFound();
    }

    throw error;
  }

  const branding = await getCurrentTenantBranding();

  return (
    <SidebarProvider>
      <AppSidebar logoUrl={branding.logoUrl} brandName={branding.title} />

      <main className="w-full min-w-0 px-4 pb-6 pt-16 md:py-6 xl:px-6">
        {children}

        <PdvLauncher
          defaultResponsible={
            session.user?.name ??
            session.user?.email ??
            "Operador"
          }
        />
      </main>
    </SidebarProvider>
  );
}
