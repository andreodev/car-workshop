import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/app/lib/auth-server";
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
