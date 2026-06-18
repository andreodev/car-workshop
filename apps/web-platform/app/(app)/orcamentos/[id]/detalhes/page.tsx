import { EstimateDetailsPage } from "@/modules/estimate";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function Page(props: PageProps) {
  return <EstimateDetailsPage {...props} />;
}
