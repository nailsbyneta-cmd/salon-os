/**
 * Helper für FormData in Server-Actions. Next.js typisiert
 * `FormData.get()` als `FormDataEntryValue | null` (= `string | File |
 * null`). Direktes String-Stringify würde für File-Einträge zu
 * `[object Object]` resultieren (ESLint @typescript-eslint/no-base-to-
 * string fängt das korrekt).
 *
 * Unsere Server-Actions erwarten immer Text-Felder; File-Uploads laufen
 * über separate APIs. Diese Helper narrowen explizit.
 */

export function formString(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === 'string' ? v : null;
}

export function formStringRequired(form: FormData, key: string): string {
  const v = formString(form, key);
  if (v === null) throw new Error(`Form field "${key}" missing or not a string`);
  return v;
}

export function formStringOr(form: FormData, key: string, fallback: string): string {
  return formString(form, key) ?? fallback;
}
