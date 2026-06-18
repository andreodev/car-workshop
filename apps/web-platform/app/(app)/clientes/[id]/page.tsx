import ClientDetailsPage from "@/modules/client/pages/client-details-page";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ClientDetailsPage id={id} />;
}
