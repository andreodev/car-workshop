import { EditWorkshopPage } from "@/modules/workshops/pages/edit-workshop-page";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <EditWorkshopPage id={id} />;
}
