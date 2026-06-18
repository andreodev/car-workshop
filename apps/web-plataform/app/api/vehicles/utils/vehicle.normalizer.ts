export function coerceNumber(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function parseYear(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);



  return {
    value: parsed,
  };
}