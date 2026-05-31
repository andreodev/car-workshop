import { ClientEditPage } from "@/modules/client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ClientEditPage id={id} />;
}
