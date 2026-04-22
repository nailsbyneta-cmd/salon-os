/**
 * Telefonnummer-Normalisierung auf E.164 (CH-biased).
 *
 * - Entfernt alle Zeichen ausser `+` und Ziffern.
 * - Führende `0` wird durch `+41` ersetzt (Schweiz-Default).
 * - Nummern mit bereits vorhandenem `+` bleiben unverändert (nach
 *   Zeichen-Strip).
 *
 * Für international-korrekte Normalisierung (DE, FR, IT etc.) müsste man
 * auf `libphonenumber-js` umsteigen — für Beautyneta St. Gallen ist 99%
 * CH-Verkehr, und CH-User geben typisch `079 xxx xx xx` ein.
 */
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) return '+41' + cleaned.slice(1);
  return cleaned;
}
