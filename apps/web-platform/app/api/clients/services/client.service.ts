import type { NextRequest } from "next/server";
import type { ClientIcms, ClientPersonType, ClientStatus, Prisma } from "@prisma/client";

import {
  clientFormSchema,
  toNullableString,
  type ClientFormSchemaOutput,
} from "@/modules/client/utils/client-form-schema";
import { clientRepository } from "../repositories/client.repository";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildClientData(values: ClientFormSchemaOutput) {
  return {
    personType: values.personType as ClientPersonType,
    status: values.status as ClientStatus,
    icms: values.icms as ClientIcms,
    name: values.name,
    cpf: toNullableString(values.cpf),
    rg: toNullableString(values.rg),
    birthDate: values.birthDate ? new Date(values.birthDate) : null,
    notesBasic: toNullableString(values.notesBasic),
    email: toNullableString(values.email),
    phoneResidential: toNullableString(values.phoneResidential),
    phoneCommercial: toNullableString(values.phoneCommercial),
    mobile: toNullableString(values.mobile),
    phone1: toNullableString(values.phone1),
    phone2: toNullableString(values.phone2),
    phone3: toNullableString(values.phone3),
    phone4: toNullableString(values.phone4),
    website: toNullableString(values.website),
    social: toNullableString(values.social),
    otherContact: toNullableString(values.otherContact),
    notesContacts: toNullableString(values.notesContacts),
    cep: toNullableString(values.cep),
    address: toNullableString(values.address),
    number: toNullableString(values.number),
    complement: toNullableString(values.complement),
    state: toNullableString(values.state),
    city: toNullableString(values.city),
    neighborhood: toNullableString(values.neighborhood),
    ibgeCode: toNullableString(values.ibgeCode),
    notesAddress: toNullableString(values.notesAddress),
  } satisfies Prisma.ClientCreateInput;
}

export const clientService = {
  async list(request: NextRequest, tenantId: string) {
    const { searchParams } = new URL(request.url);
    const page = coerceNumber(searchParams.get("page"), 1);
    const pageSize = Math.min(
      coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = normalizeString(searchParams.get("search")) ?? "";
    const status = normalizeString(searchParams.get("status"));

    const where: Prisma.ClientWhereInput = {
      tenantId,
    };

    if (status && status !== "TODOS") {
      where.status = status as ClientStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { phoneResidential: { contains: search, mode: "insensitive" } },
        { phoneCommercial: { contains: search, mode: "insensitive" } },
        { phone1: { contains: search, mode: "insensitive" } },
      ];
    }

    const { total, items } = await clientRepository.findPaginated({
      where,
      page,
      pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  },

  async create(payload: Record<string, unknown>, tenantId: string) {
    const parsed = clientFormSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
        status: 400,
      } as const;
    }

    const client = await clientRepository.create({
      ...buildClientData(parsed.data),
      tenantId,
    });

    return {
      data: client,
    };
  },

  async findById(id: string, tenantId: string) {
    const client = await clientRepository.findById(id, tenantId);

    if (!client) {
      return {
        error: "Cliente não encontrado.",
        status: 404,
      } as const;
    }

    return {
      data: client,
    };
  },

  async update(id: string, payload: Record<string, unknown>, tenantId: string) {
    const parsed = clientFormSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
        status: 400,
      } as const;
    }

    const client = await clientRepository.findById(id, tenantId);

    if (!client) {
      return {
        error: "Cliente não encontrado.",
        status: 404,
      } as const;
    }

    const updatedClient = await clientRepository.update(
      id,
      tenantId,
      buildClientData(parsed.data),
    );

    return {
      data: updatedClient,
    };
  },

  async remove(id: string, tenantId: string) {
    await clientRepository.remove(id, tenantId);

    return {
      data: {
        ok: true,
      },
    };
  },
};
