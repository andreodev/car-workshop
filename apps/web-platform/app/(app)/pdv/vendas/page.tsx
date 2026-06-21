import { Suspense } from "react";
import { getServerAuthSession } from "@/app/lib/auth-server";
import { PdvSalesPage } from "@/modules/pdv";

export default async function SalesPage() {
  const session = await getServerAuthSession();

  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-muted-foreground">
          Carregando vendas...
        </div>
      }
    >
      <PdvSalesPage
        defaultResponsible={
          session?.user?.name ?? session?.user?.email ?? "Operador"
        }
      />
    </Suspense>
  );
}