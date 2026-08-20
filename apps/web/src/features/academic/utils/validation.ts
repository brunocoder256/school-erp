/**
 * Frontend validation + backend error mapping helpers for F05 forms.
 * Backend validation remains authoritative; these helpers only translate
 * the server's `errors` field map into per-field message strings.
 */

export type FieldErrors = Record<string, string[]>;

export function getFieldError(
  errors: FieldErrors | null | undefined,
  field: string,
): string | undefined {
  const messages = errors?.[field];
  if (!messages || messages.length === 0) return undefined;
  return messages.join(" ");
}

export function getFormErrors(
  errors: FieldErrors | null | undefined,
): Record<string, string> {
  if (!errors) return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (messages.length > 0) {
      out[field] = messages.join(" ");
    }
  }
  return out;
}
