import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { serviceOrderRepository } from "../repositories/service-order.repository";
import { ServiceOrderStockError } from "../stock-sync";
import {
  coerceNumber,
  normalizeString,
  parseDateTime,
  parsePositiveInt,
  parseServiceOrderItems,
  parseServiceOrderStatus,
  type ParsedServiceOrderItems,
} from "../utils/service-order.normalizer";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

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

function buildServiceOrderWhere(params: {
  search: string;
  status: string | null;
  includeArchived: boolean;
}) {
  const { search, status, includeArchived } = params;
  const where: Prisma.ServiceOrderWhereInput = {};

  if (status && status !== "TODOS") {
    const parsedStatus = parseServiceOrderStatus(status);

    if (parsedStatus.error) {
      return serviceError(parsedStatus.error, 400);
    }

    where.status = parsedStatus.value;
  }

  if ((!status || status === "TODOS") && !includeArchived) {
    where.status = { notIn: ["FINALIZADA", "CANCELADA"] };
  }

  if (search) {
    const or: Prisma.ServiceOrderWhereInput[] = [
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

  return { data: where };
}

async function validateCatalogItems(items: ParsedServiceOrderItems["items"]) {
  const catalogItemIds = Array.from(
    new Set(items.map((item) => item.catalogItemId).filter((id): id is string => Boolean(id))),
  );

  if (catalogItemIds.length === 0) {
    return null;
  }

  const catalogItems = await serviceOrderRepository.findCatalogItemsByIds(catalogItemIds);
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

async function buildServiceOrderData(
  payload: Record<string, unknown>,
  responsibleFallback: string | null | undefined,
  mode: "create" | "update",
) {
  const clientId = normalizeString(payload.clientId);
  const vehicleId = normalizeString(payload.vehicleId);
  const mechanicId = normalizeString(payload.mechanicId);
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

  const entryAt = parseDateTime(payload.entryAt, "Data de entrada");

  if (entryAt.error) {
    return serviceError(entryAt.error, 400);
  }

  const estimatedAtRaw = normalizeString(payload.estimatedAt);
  const estimatedAt = estimatedAtRaw ? parseDateTime(estimatedAtRaw, "Data prevista") : null;

  if (estimatedAt?.error) {
    return serviceError(estimatedAt.error, 400);
  }

  const kmParsed = parsePositiveInt(payload.km, "Km");

  if (kmParsed?.error) {
    return serviceError(kmParsed.error, 400);
  }

  const itemsParsed = parseServiceOrderItems(payload.items);

  if ("error" in itemsParsed) {
    return serviceError(itemsParsed.error ?? "Dados inválidos.", 400);
  }

  const catalogItemsError = await validateCatalogItems(itemsParsed.items);

  if (catalogItemsError) {
    return serviceError(catalogItemsError, 400);
  }

  const status = parseServiceOrderStatus(payload.status);

  if (status.error) {
    return serviceError(status.error, 400);
  }

  const client = await serviceOrderRepository.findClientById(clientId);

  if (!client) {
    return serviceError("Cliente não encontrado.", 400);
  }

  const vehicle = await serviceOrderRepository.findVehicleById(vehicleId);

  if (!vehicle) {
    return serviceError("Veículo não encontrado.", 400);
  }

  if (vehicle.clientId !== clientId) {
    return serviceError("Veículo nao pertence ao cliente.", 400);
  }

  const mechanic = await serviceOrderRepository.findMechanicById(mechanicId);

  if (!mechanic) {
    return serviceError("Mecânico não encontrado.", 400);
  }

  if (!mechanic.active) {
    return serviceError("Mecânico inativo.", 400);
  }

  const baseData = {
    client: { connect: { id: clientId } },
    vehicle: { connect: { id: vehicleId } },
    mechanic: { connect: { id: mechanicId } },
    responsible,
    status: status.value,
    location: normalizeString(payload.location),
    km: kmParsed?.value ?? null,
    entryAt: entryAt.value as Date,
    estimatedAt: estimatedAt?.value ?? null,
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
          create: itemsParsed.items,
        },
      } satisfies Prisma.ServiceOrderCreateInput,
    };
  }

  return {
    data: {
      ...baseData,
      items: {
        deleteMany: {},
        create: itemsParsed.items,
      },
    } satisfies Prisma.ServiceOrderUpdateInput,
  };
}

async function runStockSafe<T>(callback: () => Promise<T>) {
  try {
    return {
      data: await callback(),
    };
  } catch (error) {
    if (error instanceof ServiceOrderStockError) {
      return serviceError(error.message, 400);
    }

    throw error;
  }
}

export const serviceOrderService = {
  async list(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page = coerceNumber(searchParams.get("page"), 1);
    const pageSize = Math.min(
      coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = normalizeString(searchParams.get("search")) ?? "";
    const status = normalizeString(searchParams.get("status"));
    const includeArchived = searchParams.get("includeArchived") === "true";
    const where = buildServiceOrderWhere({ search, status, includeArchived });

    if ("error" in where) {
      return where;
    }

    const { total, items } = await serviceOrderRepository.findPaginated({
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
    const parsed = await buildServiceOrderData(payload, responsibleFallback, "create");

    if ("error" in parsed) {
      return parsed;
    }

    return runStockSafe(async () => serializeData(await serviceOrderRepository.createWithSync(parsed.data)));
  },

  async findById(id: string) {
    const order = await serviceOrderRepository.findById(id);

    if (!order) {
      return serviceError("Ordem de serviço não encontrada.", 404);
    }

    return {
      data: serializeData(order),
    };
  },

  async update(
    id: string,
    payload: Record<string, unknown>,
    responsibleFallback: string | null | undefined,
  ) {
    const parsed = await buildServiceOrderData(payload, responsibleFallback, "update");

    if ("error" in parsed) {
      return parsed;
    }

    return runStockSafe(async () => serializeData(await serviceOrderRepository.updateWithSync(id, parsed.data)));
  },

  async updateStatus(id: string, payload: Record<string, unknown>) {
    const status = parseServiceOrderStatus(payload.status);

    if (status.error) {
      return serviceError(status.error, 400);
    }

    return runStockSafe(async () =>
      serializeData(await serviceOrderRepository.updateStatusWithSync(id, status.value)),
    );
  },

  async remove(id: string) {
    const existingOrder = await serviceOrderRepository.exists(id);

    if (!existingOrder) {
      return serviceError("Ordem de serviço não encontrada.", 404);
    }

    return runStockSafe(async () => {
      await serviceOrderRepository.cancelWithSync(id);

      return {
        ok: true,
      };
    });
  },
};
