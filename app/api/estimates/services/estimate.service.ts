import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  estimateRepository,
  type EstimateForConversion,
} from "../repositories/estimate.repository";
import {
  coerceNumber,
  estimateStatuses,
  normalizeString,
  parseDateTime,
  parseEstimateItems,
  parseEstimateStatus,
  toEstimateItemCreateInput,
  type EstimateStatusValue,
  type ParsedEstimateItems,
} from "../utils/estimate.normalizer";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const COMPANY_SETTINGS_KEY = "company";

function serviceError(error: string, status: number, details?: string) {
  return {
    error,
    status,
    ...(details ? { details } : {}),
  } as const;
}

function serializeData<T>(data: T) {
  return JSON.parse(JSON.stringify(data)) as T;
}

function createInspectionToken() {
  return randomBytes(24).toString("base64url");
}

function buildEstimateWhere(search: string, status: string | null) {
  const where: Prisma.EstimateWhereInput = {};

  if (status && status !== "TODOS") {
    if (!estimateStatuses.includes(status as EstimateStatusValue)) {
      return serviceError("Status do orçamento inválido.", 400);
    }

    where.status = status as EstimateStatusValue;
  }

  if (search) {
    const or: Prisma.EstimateWhereInput[] = [
      { client: { name: { contains: search, mode: "insensitive" } } },
      { vehicle: { plate: { contains: search, mode: "insensitive" } } },
      { vehicle: { model: { contains: search, mode: "insensitive" } } },
      { mechanic: { name: { contains: search, mode: "insensitive" } } },
      { sector: { name: { contains: search, mode: "insensitive" } } },
      { responsible: { contains: search, mode: "insensitive" } },
    ];

    const numericCode = Number(search);

    if (Number.isInteger(numericCode)) {
      or.push({ code: numericCode });
    }

    where.OR = or;
  }

  return { data: where };
}

async function validateCatalogItems(items: ParsedEstimateItems["items"]) {
  const catalogItemIds = Array.from(new Set(items.map((item) => item.catalogItemId)));
  const catalogItems = await estimateRepository.findCatalogItemsByIds(catalogItemIds);
  const catalogItemsById = new Map(catalogItems.map((item) => [item.id, item]));

  if (catalogItems.length !== catalogItemIds.length) {
    return "Produto ou serviço do catálogo não encontrado.";
  }

  for (const item of items) {
    const catalogItem = catalogItemsById.get(item.catalogItemId);

    if (!catalogItem?.active) {
      return `Item de catálogo inativo em "${item.description}".`;
    }

    if (item.type === "PRODUCT" && catalogItem.type !== "PRODUTO") {
      return `Selecione um produto do catálogo para "${item.description}".`;
    }

    if (item.type === "SERVICE" && catalogItem.type !== "SERVICO") {
      return `Selecione um serviço do catálogo para "${item.description}".`;
    }
  }

  return null;
}

async function buildEstimateData(
  payload: Record<string, unknown>,
  responsibleFallback: string | null | undefined,
  mode: "create" | "update",
) {
  const clientId = normalizeString(payload.clientId);
  const vehicleId = normalizeString(payload.vehicleId);
  const mechanicId = normalizeString(payload.mechanicId);
  const sectorId = normalizeString(payload.sectorId);
  const responsible = normalizeString(payload.responsible) ?? responsibleFallback;

  if (!clientId) {
    return serviceError("Cliente é obrigatório.", 400);
  }

  if (!vehicleId) {
    return serviceError("Veículo é obrigatório.", 400);
  }

  if (!mechanicId) {
    return serviceError("Mecânico é obrigatório.", 400);
  }

  if (!responsible) {
    return serviceError("Responsável é obrigatório.", 400);
  }

  const status = parseEstimateStatus(payload.status);

  if (status.error) {
    return serviceError(status.error, 400);
  }

  const validUntil = parseDateTime(payload.validUntil, "Validade");

  if (validUntil?.error) {
    return serviceError(validUntil.error, 400);
  }

  const itemsParsed = parseEstimateItems(payload.items);

  if ("error" in itemsParsed) {
    return serviceError(itemsParsed.error ?? "Dados inválidos.", 400);
  }

  const catalogItemsError = await validateCatalogItems(itemsParsed.items);

  if (catalogItemsError) {
    return serviceError(catalogItemsError, 400);
  }

  const client = await estimateRepository.findClientById(clientId);

  if (!client) {
    return serviceError("Cliente não encontrado.", 400);
  }

  const vehicle = await estimateRepository.findVehicleById(vehicleId);

  if (!vehicle) {
    return serviceError("Veículo não encontrado.", 400);
  }

  if (vehicle.clientId !== clientId) {
    return serviceError("Veículo nao pertence ao cliente.", 400);
  }

  const mechanic = await estimateRepository.findMechanicById(mechanicId);

  if (!mechanic) {
    return serviceError("Mecânico não encontrado.", 400);
  }

  if (!mechanic.active) {
    return serviceError("Mecânico inativo não pode receber orçamento.", 400);
  }

  const sector = sectorId ? await estimateRepository.findSectorById(sectorId) : null;

  if (sectorId && !sector) {
    return serviceError("Setor não encontrado.", 400);
  }

  if (sector && !sector.active) {
    return serviceError("Setor esta inativo.", 400);
  }

  const baseData = {
    client: { connect: { id: clientId } },
    vehicle: { connect: { id: vehicleId } },
    mechanic: { connect: { id: mechanicId } },
    responsible,
    status: status.value,
    type: normalizeString(payload.type) ?? "SIMPLES",
    validUntil: validUntil?.value ?? null,
    notesInternal: normalizeString(payload.notesInternal),
    notesClient: normalizeString(payload.notesClient),
    subtotal: itemsParsed.subtotal,
    discountTotal: itemsParsed.discountTotal,
    total: itemsParsed.total,
  };

  if (mode === "create") {
    return {
      data: {
        ...baseData,
        sector: sectorId ? { connect: { id: sectorId } } : undefined,
        items: {
          create: toEstimateItemCreateInput(itemsParsed.items),
        },
      } satisfies Prisma.EstimateCreateInput,
    };
  }

  return {
    data: {
      ...baseData,
      sector: sectorId ? { connect: { id: sectorId } } : { disconnect: true },
      items: {
        deleteMany: {},
        create: toEstimateItemCreateInput(itemsParsed.items),
      },
    } satisfies Prisma.EstimateUpdateInput,
  };
}

function validateEstimateForConversion(estimate: EstimateForConversion) {
  if (estimate.convertedServiceOrderId) {
    return serviceError("Orçamento já convertido em OS.", 400);
  }

  if (estimate.status !== "APROVADO") {
    return serviceError("Apenas orçamentos aprovados podem virar OS.", 400);
  }

  if (estimate.items.length === 0) {
    return serviceError("Orçamento sem itens.", 400);
  }

  const itemWithoutCatalog = estimate.items.find(
    (item) => !item.catalogItemId || !item.catalogItem,
  );

  if (itemWithoutCatalog) {
    return serviceError(
      `Selecione um item do catálogo para "${itemWithoutCatalog.description}".`,
      400,
    );
  }

  if (!estimate.mechanicId || !estimate.mechanic) {
    return serviceError("Atribua um mecânico antes de gerar a OS.", 400);
  }

  if (!estimate.mechanic.active) {
    return serviceError("Mecânico inativo não pode receber OS.", 400);
  }

  return {
    data: {
      mechanicId: estimate.mechanicId,
    },
  };
}

export const estimateService = {
  async list(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page = coerceNumber(searchParams.get("page"), 1);
    const pageSize = Math.min(
      coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = normalizeString(searchParams.get("search")) ?? "";
    const status = normalizeString(searchParams.get("status"));
    const where = buildEstimateWhere(search, status);

    if ("error" in where) {
      return where;
    }

    const { total, items } = await estimateRepository.findPaginated({
      where: where.data,
      page,
      pageSize,
    });

    return {
      data: serializeData({
        items,
        total,
        page,
        pageSize,
      }),
    };
  },

  async create(payload: Record<string, unknown>, responsibleFallback: string | null | undefined) {
    const parsed = await buildEstimateData(payload, responsibleFallback, "create");

    if ("error" in parsed) {
      return parsed;
    }

    const estimate = await estimateRepository.create(parsed.data);

    return {
      data: serializeData(estimate),
    };
  },

  async findById(id: string) {
    const estimate = await estimateRepository.findById(id);

    if (!estimate) {
      return serviceError("Orçamento não encontrado.", 404);
    }

    return {
      data: serializeData(estimate),
    };
  },

  async update(
    id: string,
    payload: Record<string, unknown>,
    responsibleFallback: string | null | undefined,
  ) {
    const parsed = await buildEstimateData(payload, responsibleFallback, "update");

    if ("error" in parsed) {
      return parsed;
    }

    const estimate = await estimateRepository.update(id, parsed.data);

    return {
      data: serializeData(estimate),
    };
  },

  async updateStatus(id: string, payload: Record<string, unknown>) {
    const status = parseEstimateStatus(payload.status);

    if (status.error) {
      return serviceError(status.error, 400);
    }

    const estimate = await estimateRepository.updateStatus(id, {
      status: status.value,
    });

    return {
      data: serializeData(estimate),
    };
  },

  async remove(id: string) {
    await estimateRepository.remove(id);

    return {
      data: {
        ok: true,
      },
    };
  },

  async convertToServiceOrder(id: string) {
    const estimate = await estimateRepository.findForConversion(id);

    if (!estimate) {
      return serviceError("Orçamento não encontrado.", 404);
    }

    const conversion = validateEstimateForConversion(estimate);

    if ("error" in conversion) {
      return conversion;
    }

    const result = await estimateRepository.convertToServiceOrder({
      estimate,
      mechanicId: conversion.data.mechanicId,
      inspectionToken: createInspectionToken(),
    });

    return {
      data: serializeData(result),
    };
  },

  async findPdfDataById(id: string) {
    const estimate = await estimateRepository.findPdfDataById(id);

    if (!estimate) {
      return serviceError("Orçamento não encontrado.", 404);
    }

    const companySettings = await estimateRepository.findCompanySettings(COMPANY_SETTINGS_KEY);

    return {
      data: {
        estimate,
        companySettings,
      },
    };
  },
};
