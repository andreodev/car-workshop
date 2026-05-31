import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Prisma } from "@prisma/client";

import { vehicleInspectionRepository } from "../repositories/vehicle-inspection.repository";
import {
  extensionForImageType,
  formatTakenAtCaption,
  hasValidImageSignature,
  isAllowedImageType,
  MAX_FILES,
  MAX_FILE_SIZE,
  normalizeInspectionToken,
  normalizeNotes,
  sanitizeOriginalFilename,
} from "../utils/vehicle-inspection.normalizer";

function serviceError(error: string, status: number) {
  return {
    error,
    status,
  } as const;
}

function serializeData<T>(data: T) {
  return JSON.parse(JSON.stringify(data)) as T;
}

type PreparedPhoto = {
  buffer: Buffer;
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  caption: string;
};

function uploadPathForToken(token: string) {
  return path.join(process.cwd(), "public", "uploads", "vehicle-inspections", token);
}

async function validatePhoto(file: File, index: number, photoTakenAt: FormDataEntryValue[]) {
  if (!isAllowedImageType(file.type)) {
    return serviceError("Envie somente imagens JPG, PNG, WebP, HEIC ou HEIF.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return serviceError("Cada foto deve ter no máximo 8 MB.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasValidImageSignature(buffer, file.type)) {
    return serviceError("Uma das fotos não parece ser uma imagem válida.", 400);
  }

  const filename = `${randomUUID()}.${extensionForImageType(file.type)}`;

  return {
    data: {
      buffer,
      filename,
      originalFilename: sanitizeOriginalFilename(file.name, filename),
      contentType: file.type,
      size: file.size,
      caption: formatTakenAtCaption(photoTakenAt[index]),
    } satisfies PreparedPhoto,
  };
}

export const vehicleInspectionService = {
  async findByToken(rawToken: string) {
    const token = normalizeInspectionToken(rawToken);

    if (!token) {
      return serviceError("Vistoria não encontrada.", 404);
    }

    const inspection = await vehicleInspectionRepository.findByToken(token);

    if (!inspection) {
      return serviceError("Vistoria não encontrada.", 404);
    }

    return {
      data: serializeData(inspection),
    };
  },

  async complete(rawToken: string, formData: FormData) {
    const token = normalizeInspectionToken(rawToken);

    if (!token) {
      return serviceError("Vistoria não encontrada.", 404);
    }

    const inspection = await vehicleInspectionRepository.findByToken(token);

    if (!inspection) {
      return serviceError("Vistoria não encontrada.", 404);
    }

    if (inspection.status === "CONCLUIDA") {
      return serviceError("Vistoria já concluída.", 409);
    }

    const notes = normalizeNotes(formData.get("notes"));

    if ("error" in notes) {
      return serviceError(notes.error ?? "Observações inválidas.", 400);
    }

    const files = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const photoTakenAt = formData.getAll("photoTakenAt");

    if (files.length === 0) {
      return serviceError("Envie ao menos uma foto do veículo.", 400);
    }

    if (files.length > MAX_FILES) {
      return serviceError(`Envie no máximo ${MAX_FILES} fotos por vistoria.`, 400);
    }

    const preparedPhotos: PreparedPhoto[] = [];

    for (const [index, file] of files.entries()) {
      const photo = await validatePhoto(file, index, photoTakenAt);

      if ("error" in photo) {
        return photo;
      }

      preparedPhotos.push(photo.data);
    }

    const uploadDir = uploadPathForToken(token);
    await mkdir(uploadDir, { recursive: true });

    const photos: Prisma.ServiceOrderVehicleInspectionPhotoCreateWithoutInspectionInput[] = [];

    for (const photo of preparedPhotos) {
      await writeFile(path.join(uploadDir, photo.filename), photo.buffer);
      photos.push({
        url: `/uploads/vehicle-inspections/${token}/${photo.filename}`,
        filename: photo.originalFilename,
        contentType: photo.contentType,
        size: photo.size,
        caption: photo.caption,
      });
    }

    const updatedInspection = await vehicleInspectionRepository.complete({
      id: inspection.id,
      notes: notes.value,
      photos,
    });

    return {
      data: serializeData(updatedInspection),
    };
  },
};
