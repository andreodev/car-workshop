export const MAX_FILES = 12;
export const MAX_FILE_SIZE = 8 * 1024 * 1024;
export const MAX_NOTES_LENGTH = 2_000;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;

export const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedImageType = (typeof allowedImageTypes)[number];

const extensionsByType: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function normalizeInspectionToken(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  return TOKEN_PATTERN.test(token) ? token : null;
}

export function normalizeString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeNotes(value: FormDataEntryValue | null) {
  const notes = normalizeString(value);

  if (!notes) {
    return { value: null };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return {
      error: `Observações devem ter no máximo ${MAX_NOTES_LENGTH} caracteres.`,
    };
  }

  return { value: notes };
}

export function isAllowedImageType(value: string): value is AllowedImageType {
  return allowedImageTypes.includes(value as AllowedImageType);
}

export function extensionForImageType(type: AllowedImageType) {
  return extensionsByType[type];
}

export function sanitizeOriginalFilename(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized
    .replace(/[/\\]/g, "-")
    .replace(/[^\w.\-() ]/g, "")
    .slice(0, 180) || fallback;
}

export function formatTakenAtCaption(value: FormDataEntryValue | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const parsed = normalized ? new Date(normalized) : new Date();
  const takenAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  return `Foto tirada em ${takenAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

export function hasValidImageSignature(buffer: Buffer, type: AllowedImageType) {
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (type === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(
      buffer.subarray(8, 12).toString("ascii"),
    )
  );
}
