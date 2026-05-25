import { getServerAuthSession } from "@/app/lib/auth-server";
import { SalesList } from "./vendas/_components/sales-list";

export default async function PdvPage() {
  const session = await getServerAuthSession();

  return (
    <SalesList
      defaultResponsible={session?.user?.name ?? session?.user?.email ?? "Operador"}
    />
  );
}
