import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/app/lib/auth-server";
import { PdvLauncher } from "./pdv/_components/pdv-launcher";

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
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              Oficina Integrada
            </span>
            <nav className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clientes">Clientes</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/veiculos">Veiculos</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orcamentos">Orcamentos</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ordens-servico">Ordem de servico</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/produtos">Produtos</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/setores">Setores</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/configuracoes">Configuracoes</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pdv">PDV (F2)</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pdv/vendas">Listar vendas</Link>
              </Button>
            </nav>
          </div>
          <div className="text-xs text-muted-foreground">
            {session.user?.name ?? session.user?.email}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <PdvLauncher
        defaultResponsible={session.user?.name ?? session.user?.email ?? "Operador"}
      />
    </div>
  );
}
