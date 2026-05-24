import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { PdvLauncher } from "./pdv/_components/pdv-launcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="mx-auto w-full max-w-[1520px] px-4 pb-6 pt-16 md:py-6 xl:px-6">
        {children}
        <PdvLauncher
          defaultResponsible={session.user?.name ?? session.user?.email ?? "Operador"}
        />
      </main>
    </SidebarProvider>
  )
}
