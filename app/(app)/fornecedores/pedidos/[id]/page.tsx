import { redirect } from "next/navigation";

type EditSupplierOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplierOrderRedirectPage({ params }: EditSupplierOrderPageProps) {
  const { id } = await params;
  redirect(`/pedidos/${id}`);
}
