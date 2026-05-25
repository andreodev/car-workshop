import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/app/lib/auth-server";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <main className="min-h-screen bg-white p-6">{children}</main>;
}
