import type { NextRequest } from "next/server";
import type { Prisma, VehicleFuel, VehicleStatus } from "@prisma/client";
import {
  coerceNumber,
  normalizeString,
  parseYear,
} from "../utils/vehicle.normalizer";
import { vehicleRepository } from "../repositories/vehicle.repository";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function parseVehicleYears(payload: Record<string, unknown>) {
  const rawManufactureYear = normalizeString(payload.manufactureYear);
  const rawModelYear = normalizeString(payload.modelYear);

  const [manufactureFromCombined, modelFromCombined] =
    rawManufactureYear?.includes("/")
      ? rawManufactureYear.split("/").map((value) => value.trim())
      : [rawManufactureYear, rawModelYear];

  const manufactureYear = parseYear(manufactureFromCombined);
  const modelYear = parseYear(rawModelYear || modelFromCombined);

  return {
    manufactureYear,
    modelYear,
  };
}

export const vehicleService = {
  async list(request: NextRequest, tenantId: string) {
    const { searchParams } = new URL(request.url);

    const page = coerceNumber(searchParams.get("page"), 1);
    const pageSize = Math.min(
      coerceNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );

    const search = normalizeString(searchParams.get("search")) ?? "";
    const status = normalizeString(searchParams.get("status"));

    const where: Prisma.VehicleWhereInput = {
      tenantId,
    };

    if (status && status !== "TODOS") {
      where.status = status as VehicleStatus;
    }

    if (search) {
      const parsedCode = Number(search);
      const isValidCode = Number.isInteger(parsedCode);

      where.OR = [
        { plate: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { version: { contains: search, mode: "insensitive" } },
        { fleet: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { chassis: { contains: search, mode: "insensitive" } },
        { renavam: { contains: search, mode: "insensitive" } },
        { engine: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        ...(isValidCode ? [{ code: parsedCode }] : []),
      ];
    }

    const { total, items } = await vehicleRepository.findPaginated({
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
    const plate = normalizeString(payload.plate);
    const clientId = normalizeString(payload.clientId);

    if (!plate) {
      return {
        error: "Placa é obrigatória.",
        status: 400,
      } as const;
    }

    if (!clientId) {
      return {
        error: "Cliente é obrigatório.",
        status: 400,
      } as const;
    }

    const client = await vehicleRepository.findClientById(clientId, tenantId);

    if (!client) {
      return {
        error: "Cliente não encontrado.",
        status: 400,
      } as const;
    }

    const { manufactureYear, modelYear } = parseVehicleYears(payload);

    if (manufactureYear && "error" in manufactureYear) {
      return {
        error: manufactureYear.error,
        status: 400,
      } as const;
    }

    if (modelYear && "error" in modelYear) {
      return {
        error: modelYear.error,
        status: 400,
      } as const;
    }

    const fuel = normalizeString(payload.fuel);
    const status = normalizeString(payload.status);

    const data: Prisma.VehicleCreateInput = {
      tenant: { connect: { id: tenantId } },
      client: { connect: { id: clientId } },
      plate,
      brand: normalizeString(payload.brand),
      model: normalizeString(payload.model),
      version: normalizeString(payload.version),
      fleet: normalizeString(payload.fleet),
      fuel: fuel ? (fuel as VehicleFuel) : null,
      color: normalizeString(payload.color),
      chassis: normalizeString(payload.chassis),
      renavam: normalizeString(payload.renavam),
      engine: normalizeString(payload.engine),
      city: normalizeString(payload.city),
      status: (status ?? "ATIVO") as VehicleStatus,
      manufactureYear: manufactureYear?.value ?? null,
      modelYear: modelYear?.value ?? null,
      notes: normalizeString(payload.notes),
    };

    const vehicle = await vehicleRepository.create(data);

    return {
      data: vehicle,
    };
  },

  async findById(id: string, tenantId: string) {
    const vehicle = await vehicleRepository.findById(id, tenantId);

    if (!vehicle) {
      return {
        error: "Veículo não encontrado.",
        status: 404,
      } as const;
    }

    return {
      data: vehicle,
    };
  },

  async update(id: string, payload: Record<string, unknown>, tenantId: string) {
    const plate = normalizeString(payload.plate);
    const clientId = normalizeString(payload.clientId);

    if (!plate) {
      return {
        error: "Placa é obrigatória.",
        status: 400,
      } as const;
    }

    if (!clientId) {
      return {
        error: "Cliente é obrigatório.",
        status: 400,
      } as const;
    }

    const vehicle = await vehicleRepository.findById(id, tenantId);

    if (!vehicle) {
      return {
        error: "Veículo não encontrado.",
        status: 404,
      } as const;
    }

    const client = await vehicleRepository.findClientById(clientId, tenantId);

    if (!client) {
      return {
        error: "Cliente não encontrado.",
        status: 400,
      } as const;
    }

    const { manufactureYear, modelYear } = parseVehicleYears(payload);

    if (manufactureYear && "error" in manufactureYear) {
      return {
        error: manufactureYear.error,
        status: 400,
      } as const;
    }

    if (modelYear && "error" in modelYear) {
      return {
        error: modelYear.error,
        status: 400,
      } as const;
    }

    const fuel = normalizeString(payload.fuel);
    const status = normalizeString(payload.status);

    const data: Prisma.VehicleUncheckedUpdateInput = {
      clientId,
      plate,
      brand: normalizeString(payload.brand),
      model: normalizeString(payload.model),
      version: normalizeString(payload.version),
      fleet: normalizeString(payload.fleet),
      fuel: fuel ? (fuel as VehicleFuel) : null,
      color: normalizeString(payload.color),
      chassis: normalizeString(payload.chassis),
      renavam: normalizeString(payload.renavam),
      engine: normalizeString(payload.engine),
      city: normalizeString(payload.city),
      status: (status ?? "ATIVO") as VehicleStatus,
      manufactureYear: manufactureYear?.value ?? null,
      modelYear: modelYear?.value ?? null,
      notes: normalizeString(payload.notes),
    };

    const updatedVehicle = await vehicleRepository.update(id, tenantId, data);

    return {
      data: updatedVehicle,
    };
  },

  async remove(id: string, tenantId: string) {
    const vehicle = await vehicleRepository.findById(id, tenantId);

    if (!vehicle) {
      return {
        error: "Veículo não encontrado.",
        status: 404,
      } as const;
    }

    await vehicleRepository.remove(id, tenantId);

    return {
      data: {
        ok: true,
      },
    };
  },
};
