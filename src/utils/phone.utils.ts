/** Normalize to 10-digit Indian local number (no +91 / country prefix). */
export function normalizePhoneNumber(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/** Match stored values that may include legacy +91 / 91 prefixes. */
export function phoneSearchVariants(phone: string): string[] {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return [];
  }
  return Array.from(
    new Set([normalized, `+91${normalized}`, `91${normalized}`]),
  );
}

export function phoneNumbersEqual(a: string, b: string): boolean {
  return normalizePhoneNumber(a) === normalizePhoneNumber(b);
}
