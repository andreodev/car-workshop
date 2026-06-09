import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { EstimateStatus, Prisma, ServiceOrderStatus } from "@prisma/client";

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
const archivedConvertedServiceOrderStatuses: ServiceOrderStatus[] = [
  "FINALIZADA",
  "PAGA",
  "CANCELADA",
];
const archivedEstimateStatuses: EstimateStatus[] = ["REJEITADO", "CANCELADO"];

type EstimateVisibility = "ATIVOS" | "ARQUIVADOS" | "TODOS";

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

function normalizeVisibility(value: string | null): EstimateVisibility {
  if (value === "ARQUIVADOS" || value === "TODOS") {
    return value;
  }

  return "ATIVOS";
}

function archivedEstimateWhere(): Prisma.EstimateWhereInput {
  return {
    OR: [
      { status: { in: archivedEstimateStatuses } },
      {
        convertedServiceOrder: {
          status: { in: archivedConvertedServiceOrderStatuses },
        },
      },
    ],
  };
}

function buildEstimateWhere(
  search: string,
  status: string | null,
  visibility: EstimateVisibility,
) {
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
      { responsible: { contains: search, mode: "insensitive" } },
    ];

    const numericCode = Number(search);

    if (Number.isInteger(numericCode)) {
      or.push({ code: numericCode });
    }

    where.OR = or;
  }

  if (visibility === "ATIVOS") {
    where.NOT = archivedEstimateWhere();
  }

  if (visibility === "ARQUIVADOS") {
    where.AND = [archivedEstimateWhere()];
  }

  return { data: where };
}

async function validateCatalogItems(items: ParsedEstimateItems["items"]) {
  const catalogItemIds = Array.from(
    new Set(
      items
        .map((item) => item.catalogItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (catalogItemIds.length === 0) {
    return null;
  }

  const catalogItems = await estimateRepository.findCatalogItemsByIds(catalogItemIds);
  const catalogItemsById = new Map(catalogItems.map((item) => [item.id, item]));

  if (catalogItems.length !== catalogItemIds.length) {
    return "Produto ou serviço do catálogo não encontrado.";
  }

  for (const item of items) {
    if (!item.catalogItemId) {
      continue;
    }

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

async function validateItemMechanics(items: ParsedEstimateItems["items"]) {
  const serviceItems = items.filter((item) => item.type === "SERVICE");
  const mechanicIds = Array.from(
    new Set(serviceItems.map((item) => item.mechanicId).filter((id): id is string => Boolean(id))),
  );

  if (serviceItems.some((item) => !item.mechanicId)) {
    return "Mecânico do item é obrigatório.";
  }

  if (serviceItems.length > 0 && mechanicIds.length === 0) {
    return "Mecânico do item é obrigatório.";
  }

  const mechanics = await estimateRepository.findMechanicsByIds(mechanicIds);
  const mechanicsById = new Map(mechanics.map((mechanic) => [mechanic.id, mechanic]));

  if (mechanics.length !== mechanicIds.length) {
    return "Mecânico do item não encontrado.";
  }

  for (const item of serviceItems) {
    const itemMechanicId = item.mechanicId;

    if (!itemMechanicId || !mechanicsById.get(itemMechanicId)?.active) {
      return `Mecânico inativo não pode receber o item "${item.description}".`;
    }
  }

  return null;
}

async function validateItemSectors(items: ParsedEstimateItems["items"]) {
  const serviceItems = items.filter((item) => item.type === "SERVICE");
  const sectorIds = Array.from(
    new Set(serviceItems.map((item) => item.sectorId).filter((id): id is string => Boolean(id))),
  );

  if (serviceItems.some((item) => !item.sectorId)) {
    return "Setor do item é obrigatório.";
  }

  if (serviceItems.length > 0 && sectorIds.length === 0) {
    return "Setor do item é obrigatório.";
  }

  const sectors = await estimateRepository.findSectorsByIds(sectorIds);
  const sectorsById = new Map(sectors.map((sector) => [sector.id, sector]));

  if (sectors.length !== sectorIds.length) {
    return "Setor do item nÃ£o encontrado.";
  }

  for (const item of serviceItems) {
    const itemSectorId = item.sectorId;

    if (!itemSectorId || !sectorsById.get(itemSectorId)?.active) {
      return `Setor inativo nÃ£o pode receber o item "${item.description}".`;
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
  const responsible = normalizeString(payload.responsible) ?? responsibleFallback;

  if (!clientId) {
    return serviceError("Cliente é obrigatório.", 400);
  }

  if (!vehicleId) {
    return serviceError("Veículo é obrigatório.", 400);
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

  itemsParsed.items = itemsParsed.items.map((item) => ({
    ...item,
    mechanicId: item.mechanicId,
    sectorId: item.sectorId,
  }));

  const catalogItemsError = await validateCatalogItems(itemsParsed.items);

  if (catalogItemsError) {
    return serviceError(catalogItemsError, 400);
  }

  const itemMechanicsError = await validateItemMechanics(itemsParsed.items);

  if (itemMechanicsError) {
    return serviceError(itemMechanicsError, 400);
  }

  const itemSectorsError = await validateItemSectors(itemsParsed.items);

  if (itemSectorsError) {
    return serviceError(itemSectorsError, 400);
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

  const baseData = {
    client: { connect: { id: clientId } },
    vehicle: { connect: { id: vehicleId } },
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
        items: {
          create: toEstimateItemCreateInput(itemsParsed.items),
        },
      } satisfies Prisma.EstimateCreateInput,
    };
  }

  return {
    data: {
      ...baseData,
      mechanic: { disconnect: true },
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

  const mechanicId = estimate.items.find((item) => item.mechanicId)?.mechanicId ?? null;
  const mechanic = estimate.items.find((item) => item.mechanicId === mechanicId)?.mechanic;

  if (!mechanicId || !mechanic) {
    return serviceError("Atribua um mecânico aos itens antes de gerar a OS.", 400);
  }

  if (!mechanic.active) {
    return serviceError("Mecânico inativo não pode receber OS.", 400);
  }

  return {
    data: {
      mechanicId,
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
    const visibility = normalizeVisibility(normalizeString(searchParams.get("visibility")));
    const where = buildEstimateWhere(search, status, visibility);

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

    const estimate = await estimateRepository.create(parsed.data as Prisma.EstimateCreateInput);

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

    const estimate = await estimateRepository.update(id, parsed.data as Prisma.EstimateUpdateInput);

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
