import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";

import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES = 12;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function normalizeString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTakenAtCaption(value: FormDataEntryValue | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const parsed = normalized ? new Date(normalized) : new Date();
  const takenAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  return `Foto tirada em ${takenAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

function extensionForFile(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  if (byType[file.type]) {
    return byType[file.type];
  }

  const originalExtension = file.name.split(".").pop()?.toLowerCase();
  return originalExtension?.replace(/[^a-z0-9]/g, "") || "jpg";
}

function serializeInspection(inspection: NonNullable<Awaited<ReturnType<typeof findInspection>>>) {
  return JSON.parse(JSON.stringify(inspection));
}

function findInspection(token: string) {
  return prisma.serviceOrderVehicleInspection.findUnique({
    where: { token },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      serviceOrder: {
        select: {
          id: true,
          code: true,
          entryAt: true,
          client: { select: { name: true } },
          vehicle: {
            select: {
              plate: true,
              brand: true,
              model: true,
              version: true,
              color: true,
            },
          },
        },
      },
    },
  });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const inspection = await findInspection(token);

  if (!inspection) {
    return Response.json({ error: "Vistoria não encontrada." }, { status: 404 });
  }

  return Response.json(serializeInspection(inspection));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const inspection = await findInspection(token);

  if (!inspection) {
    return Response.json({ error: "Vistoria não encontrada." }, { status: 404 });
  }

  const formData = await request.formData();
  const notes = normalizeString(formData.get("notes"));
  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const photoTakenAt = formData.getAll("photoTakenAt");

  if (files.length === 0) {
    return Response.json({ error: "Envie ao menos uma foto do veículo." }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `Envie no máximo ${MAX_FILES} fotos por vistoria.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Envie somente arquivos de imagem." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Cada foto deve ter no máximo 8 MB." },
        { status: 400 }
      );
    }
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "vehicle-inspections", token);
  await mkdir(uploadDir, { recursive: true });

  const createdPhotos = await Promise.all(
    files.map(async (file, index) => {
      const filename = `${randomUUID()}.${extensionForFile(file)}`;
      const destination = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(destination, buffer);

      return {
        url: `/uploads/vehicle-inspections/${token}/${filename}`,
        filename: file.name || filename,
        contentType: file.type,
        size: file.size,
        caption: formatTakenAtCaption(photoTakenAt[index]),
      };
    })
  );

  const updatedInspection = await prisma.serviceOrderVehicleInspection.update({
    where: { id: inspection.id },
    data: {
      notes,
      status: "CONCLUIDA",
      completedAt: new Date(),
      photos: {
        create: createdPhotos,
      },
    },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      serviceOrder: {
        select: {
          id: true,
          code: true,
          entryAt: true,
          client: { select: { name: true } },
          vehicle: {
            select: {
              plate: true,
              brand: true,
              model: true,
              version: true,
              color: true,
            },
          },
        },
      },
    },
  });

  return Response.json(serializeInspection(updatedInspection), { status: 201 });
}
