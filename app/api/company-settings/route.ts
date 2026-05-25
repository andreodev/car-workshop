import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getServerAuthSession } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/prisma";
import {
  companySettingsFormSchema,
  toNullableString,
} from "@/app/(app)/configuracoes/dados-empresa/company-settings-form-schema";

export const dynamic = "force-dynamic";

const COMPANY_SETTINGS_KEY = "company";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const settings = await prisma.companySettings.findUnique({
    where: { singletonKey: COMPANY_SETTINGS_KEY },
  });

  return Response.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = companySettingsFormSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const data = {
    legalName: parsed.data.legalName,
    tradeName: toNullableString(parsed.data.tradeName),
    document: toNullableString(parsed.data.document),
    stateRegistration: toNullableString(parsed.data.stateRegistration),
    municipalRegistration: toNullableString(parsed.data.municipalRegistration),
    email: toNullableString(parsed.data.email),
    phone: toNullableString(parsed.data.phone),
    whatsapp: toNullableString(parsed.data.whatsapp),
    website: toNullableString(parsed.data.website),
    cep: toNullableString(parsed.data.cep),
    address: toNullableString(parsed.data.address),
    number: toNullableString(parsed.data.number),
    complement: toNullableString(parsed.data.complement),
    neighborhood: toNullableString(parsed.data.neighborhood),
    city: toNullableString(parsed.data.city),
    state: toNullableString(parsed.data.state),
    ibgeCode: toNullableString(parsed.data.ibgeCode),
    logoUrl: toNullableString(parsed.data.logoUrl),
    documentFooter: toNullableString(parsed.data.documentFooter),
    commercialNotes: toNullableString(parsed.data.commercialNotes),
  } satisfies Prisma.CompanySettingsUncheckedUpdateInput;

  const settings = await prisma.companySettings.upsert({
    where: { singletonKey: COMPANY_SETTINGS_KEY },
    create: {
      singletonKey: COMPANY_SETTINGS_KEY,
      ...data,
    },
    update: data,
  });

  return Response.json(settings);
}
