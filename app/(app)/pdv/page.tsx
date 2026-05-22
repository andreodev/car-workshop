import { getServerAuthSession } from "@/app/lib/auth-server";
import { PdvHome } from "./_components/pdv-home";

export default async function PdvPage() {
  const session = await getServerAuthSession();

  return (
    <PdvHome
      defaultResponsible={session?.user?.name ?? session?.user?.email ?? "Operador"}
    />
  );
}
