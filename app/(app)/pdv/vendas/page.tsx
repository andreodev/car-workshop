import { getServerAuthSession } from "@/app/lib/auth-server";
import { PdvSalesPage } from "@/modules/pdv";

export default async function SalesPage() {
  const session = await getServerAuthSession();

  return (
    <PdvSalesPage
      defaultResponsible={session?.user?.name ?? session?.user?.email ?? "Operador"}
    />
  );
}
