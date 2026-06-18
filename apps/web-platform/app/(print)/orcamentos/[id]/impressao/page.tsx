"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCompanySettings } from "@/app/(app)/configuracoes/dados-empresa/company-settings-api";
import type { CompanySettings } from "@/app/(app)/configuracoes/dados-empresa/types";
import { EstimatePrint, fetchEstimate } from "@/modules/estimate";

type EstimatePrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EstimatePrintPage({ params }: EstimatePrintPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["estimate", id],
    queryFn: () => fetchEstimate(id),
  });
  const { data: companySettings } = useQuery<CompanySettings | null>({
    queryKey: ["company-settings"],
    queryFn: fetchCompanySettings,
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando orçamento...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Não foi possível carregar o orçamento.
      </div>
    );
  }

  return <EstimatePrint estimate={data} companySettings={companySettings ?? null} />;
}
