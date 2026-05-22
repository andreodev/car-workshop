import { getServerAuthSession } from "@/app/lib/auth-server";
import { SalesList } from "./_components/sales-list";

export default async function SalesPage() {
  const session = await getServerAuthSession();

  return (
    <SalesList
      defaultResponsible={session?.user?.name ?? session?.user?.email ?? "Operador"}
    />
  );
}
