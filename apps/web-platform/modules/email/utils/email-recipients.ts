const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailRecipients(value: string | string[] | null | undefined) {
  const rawRecipients = Array.isArray(value)
    ? value
    : (value ?? "").split(/[;,]/);

  return Array.from(
    new Set(
      rawRecipients
        .map((recipient) => recipient.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function hasInvalidEmailRecipient(recipients: string[]) {
  return recipients.some((recipient) => !EMAIL_PATTERN.test(recipient));
}
