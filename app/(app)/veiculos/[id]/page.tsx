import { VehicleEditPage } from "@/modules/vehicle";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <VehicleEditPage id={id} />;
}
